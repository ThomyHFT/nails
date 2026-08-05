import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CancelBookingByProfessionalUseCase } from "@/server/application/booking/cancel-booking.use-case";
import { BookingNotFoundError, BookingNotOwnedError } from "@/server/application/booking/booking-guard-errors";
import { SendBookingNotificationUseCase } from "@/server/application/notification/send-booking-notification.use-case";
import { RemoveBookingFromCalendarUseCase } from "@/server/application/calendar/remove-booking-from-calendar.use-case";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { DrizzleBrandingRepository } from "@/server/infrastructure/repositories/drizzle-branding.repository";
import { DrizzleEmailNotificationRepository } from "@/server/infrastructure/repositories/drizzle-email-notification.repository";
import { DrizzleGoogleCalendarConnectionRepository } from "@/server/infrastructure/repositories/drizzle-google-calendar-connection.repository";
import { ResendEmailSender } from "@/server/infrastructure/email/resend-email-sender";
import { GoogleCalendarGateway } from "@/server/infrastructure/calendar/google-calendar-gateway";
import { AesTokenCipher } from "@/server/infrastructure/security/aes-token-cipher";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { env } from "@/server/infrastructure/config/env";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session || session.user.role !== "professional") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const professional = await new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id);
  if (!professional) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const bookingRepository = new DrizzleBookingRepository();
  const useCase = new CancelBookingByProfessionalUseCase(bookingRepository);
  try {
    const booking = await useCase.execute(id, professional.id);

    try {
      const notificationUseCase = new SendBookingNotificationUseCase(
        bookingRepository,
        new DrizzleUserRepository(),
        new DrizzleProfessionalRepository(),
        new DrizzleBrandingRepository(),
        env.RESEND_API_KEY
          ? new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM_ADDRESS ?? "onboarding@resend.dev")
          : null,
        new DrizzleEmailNotificationRepository(),
      );
      await notificationUseCase.execute({ bookingId: booking.id, type: "cancellation" });
    } catch {
      // Un fallo al notificar nunca debe cambiar la respuesta de rechazar la reserva.
    }

    try {
      if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.CALENDAR_TOKEN_KEY) {
        const cipher = new AesTokenCipher(Buffer.from(env.CALENDAR_TOKEN_KEY, "base64"));
        const removeUseCase = new RemoveBookingFromCalendarUseCase(
          bookingRepository,
          new DrizzleGoogleCalendarConnectionRepository(cipher),
          new GoogleCalendarGateway(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET),
        );
        await removeUseCase.execute(booking.id);
      }
    } catch {
      // Un fallo de Google Calendar nunca debe cambiar la respuesta de rechazar la reserva.
    }

    return NextResponse.json({ booking });
  } catch (err) {
    if (err instanceof BookingNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof BookingNotOwnedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
