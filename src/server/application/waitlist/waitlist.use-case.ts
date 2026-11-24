import type { Booking } from "@/server/domain/booking/booking.entity";
import type { BrandingRepository } from "@/server/domain/branding/branding-repository.port";
import { defaultTenantBranding } from "@/server/domain/branding/default-tenant-branding";
import type { EmailNotificationRepository } from "@/server/domain/notification/email-notification-repository.port";
import type { EmailSender } from "@/server/domain/notification/email-sender.port";
import { buildWaitlistEmail } from "@/server/domain/notification/email-templates";
import { isPhoneVisible } from "@/server/domain/professional/professional.entity";
import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import type { ServicesRepository } from "@/server/domain/service/services-repository.port";
import { isPlaceholderEmail, whatsAppLink } from "@/server/domain/user/client-contact";
import type { UserRepository } from "@/server/domain/user/user-repository.port";
import {
  MAX_WAITLIST_ENTRIES_PER_CLIENT,
  localDateIn,
  type WaitlistEntry,
  type WaitlistRepository,
} from "@/server/domain/waitlist/waitlist";

export class WaitlistPastDateError extends Error {
  constructor() {
    super("Ese día ya pasó");
    this.name = "WaitlistPastDateError";
  }
}

export class WaitlistLimitError extends Error {
  constructor() {
    super(`Puedes esperar hasta ${MAX_WAITLIST_ENTRIES_PER_CLIENT} días a la vez`);
    this.name = "WaitlistLimitError";
  }
}

export class WaitlistEntryNotFoundError extends Error {
  constructor() {
    super("No estás en esa lista de espera");
    this.name = "WaitlistEntryNotFoundError";
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class JoinWaitlistUseCase {
  constructor(private readonly waitlist: WaitlistRepository) {}

  async execute(input: {
    professionalId: string;
    timezone: string;
    clientUserId: string;
    serviceVariantId: string;
    date: string;
    now?: Date;
  }): Promise<WaitlistEntry> {
    const today = localDateIn(input.now ?? new Date(), input.timezone);
    if (!DATE_PATTERN.test(input.date) || input.date < today) throw new WaitlistPastDateError();

    const current = await this.waitlist.listByClient(input.professionalId, input.clientUserId, today);
    const alreadyThatDay = current.some((entry) => entry.date === input.date);
    if (!alreadyThatDay && current.length >= MAX_WAITLIST_ENTRIES_PER_CLIENT) throw new WaitlistLimitError();

    return this.waitlist.createOrGet({
      professionalId: input.professionalId,
      clientUserId: input.clientUserId,
      serviceVariantId: input.serviceVariantId,
      date: input.date,
    });
  }
}

export class LeaveWaitlistUseCase {
  constructor(private readonly waitlist: WaitlistRepository) {}

  async execute(entryId: string, clientUserId: string): Promise<void> {
    const entry = await this.waitlist.findById(entryId);
    if (!entry || entry.clientUserId !== clientUserId) throw new WaitlistEntryNotFoundError();
    await this.waitlist.delete(entryId);
  }
}

export interface NotifyWaitlistResult {
  sent: number;
  skipped: number;
  failed: number;
}

/**
 * Se liberó la hora de `freedBooking` (SPEC 21): avisa a las clientas en
 * espera de ese día. Cada entrada se reclama antes de enviar, así dos
 * cancelaciones seguidas no mandan dos correos a la misma clienta.
 */
export class NotifyWaitlistUseCase {
  constructor(
    private readonly waitlist: WaitlistRepository,
    private readonly professionalRepository: ProfessionalRepository,
    private readonly userRepository: UserRepository,
    private readonly brandingRepository: BrandingRepository,
    private readonly servicesRepository: ServicesRepository,
    private readonly emailSender: EmailSender | null,
    private readonly emailNotificationRepository: EmailNotificationRepository,
  ) {}

  async execute(input: { freedBooking: Booking; baseUrl: string; now?: Date }): Promise<NotifyWaitlistResult> {
    const result: NotifyWaitlistResult = { sent: 0, skipped: 0, failed: 0 };
    const { freedBooking } = input;
    const professional = await this.professionalRepository.findById(freedBooking.professionalId);
    if (!professional) return result;

    const date = localDateIn(freedBooking.startsAt, professional.timezone);
    if (freedBooking.startsAt.getTime() <= (input.now ?? new Date()).getTime()) return result;

    const entries = await this.waitlist.listUnnotified(professional.id, date);
    if (entries.length === 0) return result;
    const branding = (await this.brandingRepository.findByProfessionalId(professional.id)) ?? defaultTenantBranding(professional.id);

    for (const entry of entries) {
      // Quien liberó la hora no necesita que le avisen de su propia cancelación.
      if (entry.clientUserId === freedBooking.clientUserId) {
        result.skipped += 1;
        continue;
      }
      const client = await this.userRepository.findById(entry.clientUserId);
      if (!this.emailSender || !client || isPlaceholderEmail(client.email)) {
        result.skipped += 1;
        continue;
      }
      if (!(await this.waitlist.claimNotification(entry.id))) {
        result.skipped += 1;
        continue;
      }

      const variant = await this.servicesRepository.findVariantById(entry.serviceVariantId, professional.id);
      const service = variant ? await this.servicesRepository.findById(variant.serviceId, professional.id) : null;
      const query = variant ? `service=${variant.serviceId}&variant=${variant.id}&fecha=${date}` : `fecha=${date}`;
      const template = buildWaitlistEmail({
        booking: freedBooking,
        branding,
        professionalName: professional.businessName,
        professionalWhatsAppUrl:
          isPhoneVisible(professional) && professional.phone ? whatsAppLink(professional.phone) : null,
        date,
        serviceName: service?.name ?? null,
        bookUrl: `${input.baseUrl}/${professional.slug}/reservar?${query}`,
      });

      const sent = await this.emailSender
        .send({ to: client.email, subject: template.subject, html: template.html })
        .catch((error: unknown) => ({ ok: false as const, error: error instanceof Error ? error.message : "Error" }));
      await this.emailNotificationRepository
        .create({
          professionalId: professional.id,
          bookingId: freedBooking.id,
          type: "waitlist",
          status: sent.ok ? "sent" : "failed",
          errorMessage: sent.ok ? null : sent.error,
        })
        .catch(() => undefined);
      result[sent.ok ? "sent" : "failed"] += 1;
    }
    return result;
  }
}
