import type { Booking } from "@/server/domain/booking/booking.entity";
import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { BrandingRepository } from "@/server/domain/branding/branding-repository.port";
import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";
import type { EmailNotificationRepository } from "@/server/domain/notification/email-notification-repository.port";
import type { EmailSender } from "@/server/domain/notification/email-sender.port";
import {
  buildCancellationEmail,
  buildClientCancelledEmail,
  buildConfirmationEmail,
  buildNewBookingRequestEmail,
  buildPendingEmail,
} from "@/server/domain/notification/email-templates";
import { isPhoneVisible, type Professional } from "@/server/domain/professional/professional.entity";
import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import type { User } from "@/server/domain/user/user.entity";
import { isPlaceholderEmail, whatsAppLink } from "@/server/domain/user/client-contact";
import type { UserRepository } from "@/server/domain/user/user-repository.port";

export type BookingNotificationType = "confirmation" | "cancellation" | "pending";

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
    heroLayout: "split",
    sectionOrder: null,
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
    private readonly emailSender: EmailSender | null,
    private readonly emailNotificationRepository: EmailNotificationRepository,
  ) {}

  async execute(input: {
    bookingId: string;
    type: BookingNotificationType;
    baseUrl?: string;
    /** Reserva recién creada por la clienta: la profesional recibe el aviso aunque nazca confirmada (SPEC 19). */
    isNewBooking?: boolean;
  }): Promise<void> {
    const booking = await this.bookingRepository.findById(input.bookingId);
    if (!booking) return;

    if (!this.emailSender) {
      await this.emailNotificationRepository.create({
        professionalId: booking.professionalId,
        bookingId: booking.id,
        type: input.type,
        status: "failed",
        errorMessage: "RESEND_API_KEY no configurada",
      });
      return;
    }

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
        professionalWhatsAppUrl:
          isPhoneVisible(professional) && professional.phone ? whatsAppLink(professional.phone) : null,
      };

      // Una clienta agendada a mano sin correo tiene una dirección de relleno
      // (SPEC 18): nunca se le escribe. Los avisos a la profesional siguen.
      if (!isPlaceholderEmail(client.email)) {
        const template =
          input.type === "confirmation"
            ? buildConfirmationEmail(templateInput)
            : input.type === "pending"
              ? buildPendingEmail(templateInput)
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
      }

      if (input.type === "cancellation" && booking.cancelledBy === "client") {
        await this.notifyProfessionalOfClientCancellation(
          booking,
          professional,
          templateInput.branding,
          client,
          input.baseUrl,
        );
      }

      // Antes de esto, la profesional nunca se enteraba de una reserva
      // nueva por correo: solo la clienta recibía el "pendiente de
      // confirmación". El resto de los tipos ya los dispara ella misma
      // (confirmar, cancelar), así que no hace falta avisarle a sí misma.
      if ((input.type === "pending" || input.isNewBooking) && input.baseUrl) {
        await this.notifyProfessionalOfNewBooking(booking, professional, templateInput.branding, client, input.baseUrl);
      }
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

  /** Mismo criterio best effort que `notifyProfessionalOfNewBooking` (SPEC 18). */
  private async notifyProfessionalOfClientCancellation(
    booking: Booking,
    professional: Professional,
    branding: TenantBranding,
    client: User,
    baseUrl: string | undefined,
  ): Promise<void> {
    if (!this.emailSender) return;

    try {
      const owner = await this.userRepository.findById(professional.ownerUserId);
      if (!owner) return;

      const template = buildClientCancelledEmail({
        booking,
        branding,
        professionalName: professional.businessName,
        clientName: client.name,
        clientWhatsAppUrl: client.phone ? whatsAppLink(client.phone) : null,
        panelUrl: baseUrl ? `${baseUrl}/${professional.slug}/admin/reservas` : null,
      });

      const result = await this.emailSender.send({ to: owner.email, subject: template.subject, html: template.html });

      await this.emailNotificationRepository.create({
        professionalId: booking.professionalId,
        bookingId: booking.id,
        type: "cancellation",
        status: result.ok ? "sent" : "failed",
        errorMessage: result.ok ? null : result.error,
      });
    } catch (error) {
      await this.emailNotificationRepository.create({
        professionalId: booking.professionalId,
        bookingId: booking.id,
        type: "cancellation",
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  /**
   * Best effort y con su propio try/catch: si esto falla, no puede tumbar el
   * correo a la clienta que ya se mandó ni hacer que `execute()` reporte esa
   * notificación como fallida en el log de la clienta.
   */
  private async notifyProfessionalOfNewBooking(
    booking: Booking,
    professional: Professional,
    branding: TenantBranding,
    client: User,
    baseUrl: string,
  ): Promise<void> {
    if (!this.emailSender) return;

    try {
      const owner = await this.userRepository.findById(professional.ownerUserId);
      if (!owner) return;

      const template = buildNewBookingRequestEmail({
        booking,
        professionalName: professional.businessName,
        branding,
        clientName: client.name,
        panelUrl: `${baseUrl}/${professional.slug}/admin/reservas#${booking.id}`,
      });

      const result = await this.emailSender.send({ to: owner.email, subject: template.subject, html: template.html });

      await this.emailNotificationRepository.create({
        professionalId: booking.professionalId,
        bookingId: booking.id,
        type: "pending",
        status: result.ok ? "sent" : "failed",
        errorMessage: result.ok ? null : result.error,
      });
    } catch (error) {
      await this.emailNotificationRepository.create({
        professionalId: booking.professionalId,
        bookingId: booking.id,
        type: "pending",
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
}
