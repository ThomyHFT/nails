import { NextResponse } from "next/server";
import { notifyWaitlistOfFreedSlot } from "@/app/api/bookings/_shared/notify-waitlist";
import { z } from "zod";
import { auth } from "@/auth";
import {
  BookingInvalidStateError,
  BookingNotFoundError,
  BookingNotOwnedError,
  ClientChangeWindowClosedError,
} from "@/server/application/booking/booking-guard-errors";
import { SlotNotAvailableError } from "@/server/application/booking/create-booking.use-case";
import { GenerateAvailableSlotsUseCase } from "@/server/application/booking/generate-available-slots.use-case";
import { RescheduleBookingUseCase, type RescheduleActor } from "@/server/application/booking/reschedule-booking.use-case";
import { RemoveBookingFromCalendarUseCase } from "@/server/application/calendar/remove-booking-from-calendar.use-case";
import { SyncBookingToCalendarUseCase } from "@/server/application/calendar/sync-booking-to-calendar.use-case";
import { NotifyRescheduleUseCase } from "@/server/application/notification/notify-reschedule.use-case";
import { GoogleCalendarGateway } from "@/server/infrastructure/calendar/google-calendar-gateway";
import { env } from "@/server/infrastructure/config/env";
import { ResendEmailSender } from "@/server/infrastructure/email/resend-email-sender";
import { DrizzleAvailabilityRepository } from "@/server/infrastructure/repositories/drizzle-availability.repository";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleBrandingRepository } from "@/server/infrastructure/repositories/drizzle-branding.repository";
import { DrizzleEmailNotificationRepository } from "@/server/infrastructure/repositories/drizzle-email-notification.repository";
import { DrizzleGoogleCalendarConnectionRepository } from "@/server/infrastructure/repositories/drizzle-google-calendar-connection.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { AesTokenCipher } from "@/server/infrastructure/security/aes-token-cipher";

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

/** La sesión decide quién mueve la reserva: clienta o dueña del tenant. */
async function resolveActor(): Promise<RescheduleActor | null> {
  const session = await auth();
  if (!session) return null;
  if (session.user.role === "client") return { kind: "client", userId: session.user.id };
  if (session.user.role === "professional") {
    const professional = await new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id);
    return professional ? { kind: "professional", professionalId: professional.id } : null;
  }
  return null;
}

/**
 * Horarios disponibles para mover la reserva a `?date=`, sin contar la propia
 * reserva como ocupada. Solo para la clienta dueña: la profesional elige libre.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const date = new URL(request.url).searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date (YYYY-MM-DD) es requerido" }, { status: 400 });
  }

  const actor = await resolveActor();
  if (!actor || actor.kind !== "client") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const bookingRepository = new DrizzleBookingRepository();
  const booking = await bookingRepository.findById(id);
  if (!booking || booking.clientUserId !== actor.userId) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }
  const professional = await new DrizzleProfessionalRepository().findById(booking.professionalId);
  if (!professional) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });

  const slots = await new GenerateAvailableSlotsUseCase(new DrizzleAvailabilityRepository(), bookingRepository).execute({
    professionalId: professional.id,
    timezone: professional.timezone,
    bufferMinutes: professional.bufferMinutes,
    date,
    durationMinutes: booking.durationMinutes,
    policy: professional.bookingPolicy,
    excludeBookingId: booking.id,
  });
  return NextResponse.json({ slots });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveActor();
  if (!actor) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Fecha u hora inválida" }, { status: 400 });

  const bookingRepository = new DrizzleBookingRepository();
  const professionalRepository = new DrizzleProfessionalRepository();
  try {
    const { booking, previousStartsAt } = await new RescheduleBookingUseCase(
      bookingRepository,
      new DrizzleAvailabilityRepository(),
      professionalRepository,
    ).execute({ bookingId: id, actor, date: parsed.data.date, time: parsed.data.time });

    try {
      await new NotifyRescheduleUseCase(
        new DrizzleUserRepository(),
        professionalRepository,
        new DrizzleBrandingRepository(),
        env.RESEND_API_KEY
          ? new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM_ADDRESS ?? "onboarding@resend.dev")
          : null,
        new DrizzleEmailNotificationRepository(),
      ).execute({ booking, previousStartsAt, movedBy: actor.kind });
    } catch {
      // Un fallo al notificar nunca debe cambiar la respuesta de reagendar.
    }

    try {
      if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.CALENDAR_TOKEN_KEY) {
        const cipher = new AesTokenCipher(Buffer.from(env.CALENDAR_TOKEN_KEY, "base64"));
        const connections = new DrizzleGoogleCalendarConnectionRepository(cipher);
        const gateway = new GoogleCalendarGateway(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
        await new RemoveBookingFromCalendarUseCase(bookingRepository, connections, gateway).execute(booking.id);
        if (booking.status === "confirmed") {
          await new SyncBookingToCalendarUseCase(
            bookingRepository,
            connections,
            gateway,
            new DrizzleUserRepository(),
            new DrizzleServicesRepository(),
          ).execute(booking.id);
        }
      }
    } catch {
      // Un fallo de Google Calendar nunca debe cambiar la respuesta de reagendar.
    }

    // SPEC 21: la hora anterior quedó libre.
    await notifyWaitlistOfFreedSlot({ ...booking, startsAt: previousStartsAt });

    return NextResponse.json({ booking });
  } catch (err) {
    if (err instanceof BookingNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    if (err instanceof BookingNotOwnedError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof SlotNotAvailableError) {
      return NextResponse.json({ error: "Ese horario ya no está disponible. Elige otro." }, { status: 409 });
    }
    if (err instanceof ClientChangeWindowClosedError || err instanceof BookingInvalidStateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
