import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { Booking } from "@/server/domain/booking/booking.entity";
import type { BrandingRepository } from "@/server/domain/branding/branding-repository.port";
import { defaultTenantBranding } from "@/server/domain/branding/default-tenant-branding";
import type { EmailNotificationRepository } from "@/server/domain/notification/email-notification-repository.port";
import type { EmailSender } from "@/server/domain/notification/email-sender.port";
import { buildRebookEmail } from "@/server/domain/notification/email-templates";
import { MAX_REBOOK_DAYS, MIN_REBOOK_DAYS } from "@/server/domain/professional/commerce";
import { isPhoneVisible, type Professional } from "@/server/domain/professional/professional.entity";
import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import type { ServicesRepository } from "@/server/domain/service/services-repository.port";
import { isPlaceholderEmail, whatsAppLink } from "@/server/domain/user/client-contact";
import type { UserRepository } from "@/server/domain/user/user-repository.port";
import { localDateIn } from "@/server/domain/waitlist/waitlist";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Si el cron no corrió algún día, la invitación sale igual dentro de este margen. */
export const REBOOK_GRACE_DAYS = 3;

export interface SendRebookResult {
  sent: number;
  failed: number;
  skipped: number;
}

function daysBetween(fromDate: string, toDate: string): number {
  return Math.round((Date.parse(`${toDate}T12:00:00Z`) - Date.parse(`${fromDate}T12:00:00Z`)) / DAY_MS);
}

/**
 * "Vuelve a reservar" (SPEC 21). Lo corre el cron diario junto a los
 * recordatorios. Invita una sola vez por reserva completada, cuando pasaron
 * los días que eligió la profesional, y nunca a una clienta que ya tiene otra
 * hora o volvió después.
 */
export class SendRebookUseCase {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly professionalRepository: ProfessionalRepository,
    private readonly userRepository: UserRepository,
    private readonly brandingRepository: BrandingRepository,
    private readonly servicesRepository: ServicesRepository,
    private readonly emailSender: EmailSender,
    private readonly emailNotificationRepository: EmailNotificationRepository,
  ) {}

  async execute(input: { now?: Date; baseUrl: string }): Promise<SendRebookResult> {
    const now = input.now ?? new Date();
    const candidates = await this.bookingRepository.listCompletedAwaitingRebook(
      new Date(now.getTime() - (MAX_REBOOK_DAYS + REBOOK_GRACE_DAYS + 1) * DAY_MS),
      new Date(now.getTime() - (MIN_REBOOK_DAYS - 1) * DAY_MS),
    );

    const professionals = new Map<string, Professional | null>();
    const result: SendRebookResult = { sent: 0, failed: 0, skipped: 0 };

    for (const booking of candidates) {
      if (!professionals.has(booking.professionalId)) {
        professionals.set(booking.professionalId, await this.professionalRepository.findById(booking.professionalId));
      }
      const professional = professionals.get(booking.professionalId);
      const afterDays = professional?.commerce.rebookAfterDays ?? null;
      if (!professional || afterDays === null) continue;

      const elapsed = daysBetween(localDateIn(booking.startsAt, professional.timezone), localDateIn(now, professional.timezone));
      if (elapsed < afterDays || elapsed > afterDays + REBOOK_GRACE_DAYS) continue;

      result[await this.invite(booking, professional, now, input.baseUrl)] += 1;
    }
    return result;
  }

  private async invite(
    booking: Booking,
    professional: Professional,
    now: Date,
    baseUrl: string,
  ): Promise<keyof SendRebookResult> {
    const history = await this.bookingRepository.listByProfessionalAndClient(professional.id, booking.clientUserId);
    const hasUpcoming = history.some(
      (b) => (b.status === "pending" || b.status === "confirmed") && b.startsAt.getTime() > now.getTime(),
    );
    const cameBack = history.some((b) => b.status === "completed" && b.startsAt.getTime() > booking.startsAt.getTime());
    if (hasUpcoming || cameBack) {
      // Ya no corresponde invitar por esta reserva: se marca para no revisarla cada día.
      await this.bookingRepository.claimRebook(booking.id);
      return "skipped";
    }

    const client = await this.userRepository.findById(booking.clientUserId);
    if (!client || isPlaceholderEmail(client.email)) {
      await this.bookingRepository.claimRebook(booking.id);
      return "skipped";
    }
    if (!(await this.bookingRepository.claimRebook(booking.id))) return "skipped";

    try {
      const [branding, variant] = await Promise.all([
        this.brandingRepository.findByProfessionalId(professional.id),
        this.servicesRepository.findVariantById(booking.serviceVariantId, professional.id),
      ]);
      const service = variant ? await this.servicesRepository.findById(variant.serviceId, professional.id) : null;
      const bookable = variant?.active && service?.active;
      const query = bookable ? `?service=${variant.serviceId}&variant=${variant.id}` : "";

      const template = buildRebookEmail({
        booking,
        branding: branding ?? defaultTenantBranding(professional.id),
        professionalName: professional.businessName,
        professionalWhatsAppUrl:
          isPhoneVisible(professional) && professional.phone ? whatsAppLink(professional.phone) : null,
        clientName: client.name,
        serviceName: service?.name ?? null,
        bookUrl: `${baseUrl}/${professional.slug}/reservar${query}`,
      });
      const sent = await this.emailSender.send({ to: client.email, subject: template.subject, html: template.html });
      await this.emailNotificationRepository.create({
        professionalId: professional.id,
        bookingId: booking.id,
        type: "rebook",
        status: sent.ok ? "sent" : "failed",
        errorMessage: sent.ok ? null : sent.error,
      });
      return sent.ok ? "sent" : "failed";
    } catch (error) {
      await this.emailNotificationRepository
        .create({
          professionalId: professional.id,
          bookingId: booking.id,
          type: "rebook",
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Error desconocido",
        })
        .catch(() => undefined);
      return "failed";
    }
  }
}
