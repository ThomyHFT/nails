import type { Booking } from "@/server/domain/booking/booking.entity";
import type { BrandingRepository } from "@/server/domain/branding/branding-repository.port";
import type { EmailNotificationRepository } from "@/server/domain/notification/email-notification-repository.port";
import type { EmailSender } from "@/server/domain/notification/email-sender.port";
import { buildRescheduledEmail } from "@/server/domain/notification/email-templates";
import { isPhoneVisible } from "@/server/domain/professional/professional.entity";
import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import { isPlaceholderEmail, whatsAppLink } from "@/server/domain/user/client-contact";
import type { UserRepository } from "@/server/domain/user/user-repository.port";
import { defaultTenantBranding } from "@/server/domain/branding/default-tenant-branding";

/**
 * Avisa a la otra parte que una reserva cambió de hora (SPEC 19): si la movió
 * la clienta, a la profesional; si la movió la profesional, a la clienta.
 * Best effort: nunca lanza.
 */
export class NotifyRescheduleUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly professionalRepository: ProfessionalRepository,
    private readonly brandingRepository: BrandingRepository,
    private readonly emailSender: EmailSender | null,
    private readonly emailNotificationRepository: EmailNotificationRepository,
  ) {}

  async execute(input: { booking: Booking; previousStartsAt: Date; movedBy: "client" | "professional" }): Promise<void> {
    const { booking } = input;
    if (!this.emailSender) return;

    try {
      const [client, professional, branding] = await Promise.all([
        this.userRepository.findById(booking.clientUserId),
        this.professionalRepository.findById(booking.professionalId),
        this.brandingRepository.findByProfessionalId(booking.professionalId),
      ]);
      if (!client || !professional) return;

      const recipient =
        input.movedBy === "client" ? (await this.userRepository.findById(professional.ownerUserId))?.email : client.email;
      if (!recipient || isPlaceholderEmail(recipient)) return;

      const template = buildRescheduledEmail({
        booking,
        branding: branding ?? defaultTenantBranding(professional.id),
        professionalName: professional.businessName,
        professionalWhatsAppUrl:
          isPhoneVisible(professional) && professional.phone ? whatsAppLink(professional.phone) : null,
        previousStartsAt: input.previousStartsAt,
        movedBy: input.movedBy,
        clientName: client.name,
        clientWhatsAppUrl: client.phone ? whatsAppLink(client.phone) : null,
      });

      const result = await this.emailSender.send({ to: recipient, subject: template.subject, html: template.html });
      await this.emailNotificationRepository.create({
        professionalId: booking.professionalId,
        bookingId: booking.id,
        type: "reschedule",
        status: result.ok ? "sent" : "failed",
        errorMessage: result.ok ? null : result.error,
      });
    } catch (error) {
      await this.emailNotificationRepository
        .create({
          professionalId: booking.professionalId,
          bookingId: booking.id,
          type: "reschedule",
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Error desconocido",
        })
        .catch(() => undefined);
    }
  }
}
