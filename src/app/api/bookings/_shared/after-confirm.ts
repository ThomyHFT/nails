import { SyncBookingToCalendarUseCase } from "@/server/application/calendar/sync-booking-to-calendar.use-case";
import { SendBookingNotificationUseCase } from "@/server/application/notification/send-booking-notification.use-case";
import { GoogleCalendarGateway } from "@/server/infrastructure/calendar/google-calendar-gateway";
import { env } from "@/server/infrastructure/config/env";
import { ResendEmailSender } from "@/server/infrastructure/email/resend-email-sender";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleBrandingRepository } from "@/server/infrastructure/repositories/drizzle-branding.repository";
import { DrizzleEmailNotificationRepository } from "@/server/infrastructure/repositories/drizzle-email-notification.repository";
import { DrizzleGoogleCalendarConnectionRepository } from "@/server/infrastructure/repositories/drizzle-google-calendar-connection.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { AesTokenCipher } from "@/server/infrastructure/security/aes-token-cipher";

/**
 * Lo que sigue a confirmar una reserva, a mano o con "Abono recibido": el
 * correo a la clienta y el evento en Google Calendar. Ningún fallo de estos
 * cambia la respuesta de la confirmación.
 */
export async function afterBookingConfirmed(bookingId: string): Promise<void> {
  const bookingRepository = new DrizzleBookingRepository();
  try {
    await new SendBookingNotificationUseCase(
      bookingRepository,
      new DrizzleUserRepository(),
      new DrizzleProfessionalRepository(),
      new DrizzleBrandingRepository(),
      env.RESEND_API_KEY
        ? new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM_ADDRESS ?? "onboarding@resend.dev")
        : null,
      new DrizzleEmailNotificationRepository(),
    ).execute({ bookingId, type: "confirmation" });
  } catch {
    // Un fallo al notificar no cambia la confirmación.
  }

  try {
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.CALENDAR_TOKEN_KEY) {
      const cipher = new AesTokenCipher(Buffer.from(env.CALENDAR_TOKEN_KEY, "base64"));
      await new SyncBookingToCalendarUseCase(
        bookingRepository,
        new DrizzleGoogleCalendarConnectionRepository(cipher),
        new GoogleCalendarGateway(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET),
        new DrizzleUserRepository(),
        new DrizzleServicesRepository(),
      ).execute(bookingId);
    }
  } catch {
    // Un fallo de Google Calendar no cambia la confirmación.
  }
}
