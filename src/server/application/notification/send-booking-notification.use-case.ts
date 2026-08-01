import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { BrandingRepository } from "@/server/domain/branding/branding-repository.port";
import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";
import type { EmailNotificationRepository } from "@/server/domain/notification/email-notification-repository.port";
import type { EmailSender } from "@/server/domain/notification/email-sender.port";
import { buildCancellationEmail, buildConfirmationEmail } from "@/server/domain/notification/email-templates";
import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import type { UserRepository } from "@/server/domain/user/user-repository.port";

export type BookingNotificationType = "confirmation" | "cancellation";

function defaultBranding(professionalId: string): TenantBranding {
  return {
    id: professionalId,
    professionalId,
    archetype: "minimal_nude",
    primaryColorHex: null,
    onPrimaryColorHex: null,
    fontPair: null,
    logoUrl: null,
    coverImageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export class SendBookingNotificationUseCase {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly userRepository: UserRepository,
    private readonly professionalRepository: ProfessionalRepository,
    private readonly brandingRepository: BrandingRepository,
    private readonly emailSender: EmailSender,
    private readonly emailNotificationRepository: EmailNotificationRepository,
  ) {}

  async execute(input: { bookingId: string; type: BookingNotificationType }): Promise<void> {
    const booking = await this.bookingRepository.findById(input.bookingId);
    if (!booking) return;

    try {
      const [client, professional, branding] = await Promise.all([
        this.userRepository.findById(booking.clientUserId),
        this.professionalRepository.findById(booking.professionalId),
        this.brandingRepository.findByProfessionalId(booking.professionalId),
      ]);

      if (!client || !professional) {
        throw new Error("No se pudo resolver la clienta o la profesional para el email");
      }

      const templateInput = {
        booking,
        professionalName: professional.businessName,
        branding: branding ?? defaultBranding(booking.professionalId),
      };

      const template =
        input.type === "confirmation"
          ? buildConfirmationEmail(templateInput)
          : buildCancellationEmail(templateInput);

      const result = await this.emailSender.send({
        to: client.email,
        subject: template.subject,
        html: template.html,
      });

      await this.emailNotificationRepository.create({
        professionalId: booking.professionalId,
        bookingId: booking.id,
        type: input.type,
        status: result.ok ? "sent" : "failed",
        errorMessage: result.ok ? null : result.error,
      });
    } catch (error) {
      await this.emailNotificationRepository.create({
        professionalId: booking.professionalId,
        bookingId: booking.id,
        type: input.type,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
}
