import type { Booking } from "@/server/domain/booking/booking.entity";
import { NotifyWaitlistUseCase } from "@/server/application/waitlist/waitlist.use-case";
import { env } from "@/server/infrastructure/config/env";
import { ResendEmailSender } from "@/server/infrastructure/email/resend-email-sender";
import { DrizzleBrandingRepository } from "@/server/infrastructure/repositories/drizzle-branding.repository";
import { DrizzleEmailNotificationRepository } from "@/server/infrastructure/repositories/drizzle-email-notification.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { DrizzleWaitlistRepository } from "@/server/infrastructure/repositories/drizzle-waitlist.repository";
import { siteUrl } from "@/app/_lib/site-url";

/**
 * Se liberó la hora de `freedBooking` (cancelada, rechazada o movida): avisa
 * a la lista de espera de ese día (SPEC 21). Nunca lanza: quien llama ya
 * terminó su escritura.
 */
export async function notifyWaitlistOfFreedSlot(freedBooking: Booking): Promise<void> {
  try {
    await new NotifyWaitlistUseCase(
      new DrizzleWaitlistRepository(),
      new DrizzleProfessionalRepository(),
      new DrizzleUserRepository(),
      new DrizzleBrandingRepository(),
      new DrizzleServicesRepository(),
      env.RESEND_API_KEY
        ? new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM_ADDRESS ?? "onboarding@resend.dev")
        : null,
      new DrizzleEmailNotificationRepository(),
    ).execute({ freedBooking, baseUrl: siteUrl() });
  } catch {
    // Un fallo al avisar no cambia la cancelación.
  }
}
