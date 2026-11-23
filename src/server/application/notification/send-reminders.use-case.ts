import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { Booking } from "@/server/domain/booking/booking.entity";
import type { BrandingRepository } from "@/server/domain/branding/branding-repository.port";
import { defaultTenantBranding } from "@/server/domain/branding/default-tenant-branding";
import type { EmailNotificationRepository } from "@/server/domain/notification/email-notification-repository.port";
import type { EmailSender } from "@/server/domain/notification/email-sender.port";
import { buildReminderEmail } from "@/server/domain/notification/email-templates";
import { isPhoneVisible, type Professional } from "@/server/domain/professional/professional.entity";
import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import type { ServicesRepository } from "@/server/domain/service/services-repository.port";
import { isPlaceholderEmail, whatsAppLink } from "@/server/domain/user/client-contact";
import type { UserRepository } from "@/server/domain/user/user-repository.port";

export interface SendRemindersResult {
  sent: number;
  failed: number;
  skipped: number;
}

function localDate(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

function nextDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Recordatorio del día antes (SPEC 19). Lo corre un cron diario: toma las
 * reservas confirmadas cuyo día local, en la zona de su profesional, es
 * mañana, y que todavía no tienen recordatorio.
 *
 * El recordatorio se reclama antes de enviar (`claimReminder`): si el cron
 * corre dos veces a la vez, solo una corrida manda el correo. Si el envío
 * falla queda registrado como fallido y no se reintenta: un recordatorio
 * repetido molesta más que uno perdido.
 */
export class SendRemindersUseCase {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly professionalRepository: ProfessionalRepository,
    private readonly userRepository: UserRepository,
    private readonly brandingRepository: BrandingRepository,
    private readonly servicesRepository: ServicesRepository,
    private readonly emailSender: EmailSender,
    private readonly emailNotificationRepository: EmailNotificationRepository,
  ) {}

  async execute(input: { now?: Date; baseUrl: string | null }): Promise<SendRemindersResult> {
    const now = input.now ?? new Date();
    // "Mañana" en cualquier zona cae dentro de las próximas 50 horas; el
    // filtro fino por día local va abajo, profesional por profesional.
    const candidates = await this.bookingRepository.listAwaitingReminder(
      now,
      new Date(now.getTime() + 50 * 60 * 60_000),
    );

    const professionals = new Map<string, Professional | null>();
    const result: SendRemindersResult = { sent: 0, failed: 0, skipped: 0 };

    for (const booking of candidates) {
      if (!professionals.has(booking.professionalId)) {
        professionals.set(booking.professionalId, await this.professionalRepository.findById(booking.professionalId));
      }
      const professional = professionals.get(booking.professionalId);
      if (!professional) continue;

      const tomorrow = nextDay(localDate(now, professional.timezone));
      if (localDate(booking.startsAt, professional.timezone) !== tomorrow) continue;

      const outcome = await this.remind(booking, professional, input.baseUrl);
      result[outcome] += 1;
    }
    return result;
  }

  private async remind(
    booking: Booking,
    professional: Professional,
    baseUrl: string | null,
  ): Promise<keyof SendRemindersResult> {
    const client = await this.userRepository.findById(booking.clientUserId);
    // Clienta sin correo real (agendada a mano): no hay a quién escribirle.
    if (!client || isPlaceholderEmail(client.email)) return "skipped";
    if (!(await this.bookingRepository.claimReminder(booking.id))) return "skipped";

    try {
      const [branding, variant] = await Promise.all([
        this.brandingRepository.findByProfessionalId(professional.id),
        this.servicesRepository.findVariantById(booking.serviceVariantId, professional.id),
      ]);
      const service = variant ? await this.servicesRepository.findById(variant.serviceId, professional.id) : null;

      const template = buildReminderEmail({
        booking,
        branding: branding ?? defaultTenantBranding(professional.id),
        professionalName: professional.businessName,
        professionalWhatsAppUrl:
          isPhoneVisible(professional) && professional.phone ? whatsAppLink(professional.phone) : null,
        serviceName: service?.name ?? null,
        accountUrl: baseUrl ? `${baseUrl}/${professional.slug}/cuenta` : null,
      });
      const sent = await this.emailSender.send({ to: client.email, subject: template.subject, html: template.html });
      await this.emailNotificationRepository.create({
        professionalId: professional.id,
        bookingId: booking.id,
        type: "reminder",
        status: sent.ok ? "sent" : "failed",
        errorMessage: sent.ok ? null : sent.error,
      });
      return sent.ok ? "sent" : "failed";
    } catch (error) {
      await this.emailNotificationRepository
        .create({
          professionalId: professional.id,
          bookingId: booking.id,
          type: "reminder",
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Error desconocido",
        })
        .catch(() => undefined);
      return "failed";
    }
  }
}
