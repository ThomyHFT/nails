import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { InvalidPhoneError } from "@/server/application/auth/register-client.use-case";
import {
  CreateManualBookingUseCase,
  ManualBookingClientNotFoundError,
  ManualBookingEmailTakenError,
  ManualBookingSlotTakenError,
  ManualBookingVariantNotFoundError,
} from "@/server/application/booking/create-manual-booking.use-case";
import { zonedDateTimeToUtc } from "@/server/application/booking/zoned-time";
import { SyncBookingToCalendarUseCase } from "@/server/application/calendar/sync-booking-to-calendar.use-case";
import { SendBookingNotificationUseCase } from "@/server/application/notification/send-booking-notification.use-case";
import { env } from "@/server/infrastructure/config/env";
import { GoogleCalendarGateway } from "@/server/infrastructure/calendar/google-calendar-gateway";
import { ResendEmailSender } from "@/server/infrastructure/email/resend-email-sender";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleBrandingRepository } from "@/server/infrastructure/repositories/drizzle-branding.repository";
import { DrizzleEmailNotificationRepository } from "@/server/infrastructure/repositories/drizzle-email-notification.repository";
import { DrizzleGoogleCalendarConnectionRepository } from "@/server/infrastructure/repositories/drizzle-google-calendar-connection.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { AesTokenCipher } from "@/server/infrastructure/security/aes-token-cipher";

const manualBookingSchema = z.object({
  serviceVariantId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  client: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("existing"), userId: z.string().uuid() }),
    z.object({
      kind: z.literal("new"),
      name: z.string().trim().min(1, "El nombre es requerido"),
      phone: z.string().min(1, "El teléfono es requerido"),
      email: z.string().email().nullable().optional(),
    }),
  ]),
  clientNote: z.string().max(500).nullable().optional(),
});

/** Reserva que anota la profesional (SPEC 18). Nace confirmada. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "professional") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const professional = await new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id);
  if (!professional) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const parsed = manualBookingSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const bookingRepository = new DrizzleBookingRepository();
  const userRepository = new DrizzleUserRepository();
  const useCase = new CreateManualBookingUseCase(bookingRepository, new DrizzleServicesRepository(), userRepository);

  let booking;
  try {
    booking = await useCase.execute({
      professionalId: professional.id,
      serviceVariantId: parsed.data.serviceVariantId,
      startsAt: zonedDateTimeToUtc(parsed.data.date, parsed.data.time, professional.timezone),
      client: parsed.data.client,
      clientNote: parsed.data.clientNote ?? null,
    });
  } catch (err) {
    if (err instanceof ManualBookingSlotTakenError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (
      err instanceof ManualBookingVariantNotFoundError ||
      err instanceof ManualBookingClientNotFoundError ||
      err instanceof ManualBookingEmailTakenError ||
      err instanceof InvalidPhoneError
    ) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  // Igual que al confirmar una reserva: el correo a la clienta (si tiene uno
  // real) y Google Calendar son best effort y nunca cambian la respuesta.
  try {
    await new SendBookingNotificationUseCase(
      bookingRepository,
      userRepository,
      new DrizzleProfessionalRepository(),
      new DrizzleBrandingRepository(),
      env.RESEND_API_KEY
        ? new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM_ADDRESS ?? "onboarding@resend.dev")
        : null,
      new DrizzleEmailNotificationRepository(),
    ).execute({ bookingId: booking.id, type: "confirmation" });
  } catch {
    // Un fallo al notificar no cambia la respuesta.
  }

  try {
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.CALENDAR_TOKEN_KEY) {
      const cipher = new AesTokenCipher(Buffer.from(env.CALENDAR_TOKEN_KEY, "base64"));
      await new SyncBookingToCalendarUseCase(
        bookingRepository,
        new DrizzleGoogleCalendarConnectionRepository(cipher),
        new GoogleCalendarGateway(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET),
        userRepository,
        new DrizzleServicesRepository(),
      ).execute(booking.id);
    }
  } catch {
    // Un fallo de Google Calendar no cambia la respuesta.
  }

  return NextResponse.json({ booking }, { status: 201 });
}
