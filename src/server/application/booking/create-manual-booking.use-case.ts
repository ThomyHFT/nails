import { BookingSlotTakenError, type BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { Booking } from "@/server/domain/booking/booking.entity";
import type { ServicesRepository } from "@/server/domain/service/services-repository.port";
import {
  isValidPhone,
  normalizePhone,
  placeholderEmail,
  UNUSABLE_PASSWORD_HASH,
} from "@/server/domain/user/client-contact";
import type { UserRepository } from "@/server/domain/user/user-repository.port";
import { InvalidPhoneError } from "@/server/application/auth/register-client.use-case";

export class ManualBookingSlotTakenError extends Error {
  constructor() {
    super("Ese horario ya está ocupado por otra reserva");
    this.name = "ManualBookingSlotTakenError";
  }
}

export class ManualBookingVariantNotFoundError extends Error {
  constructor() {
    super("El servicio elegido no existe o está desactivado");
    this.name = "ManualBookingVariantNotFoundError";
  }
}

export class ManualBookingClientNotFoundError extends Error {
  constructor() {
    super("La clienta elegida no existe");
    this.name = "ManualBookingClientNotFoundError";
  }
}

export class ManualBookingEmailTakenError extends Error {
  constructor() {
    super("Ese correo pertenece a una cuenta que no es de clienta");
    this.name = "ManualBookingEmailTakenError";
  }
}

export type ManualBookingClient =
  | { kind: "existing"; userId: string }
  | { kind: "new"; name: string; phone: string; email?: string | null };

export interface CreateManualBookingInput {
  professionalId: string;
  /** Quién atiende (SPEC 22). */
  staffId: string;
  serviceVariantId: string;
  startsAt: Date;
  client: ManualBookingClient;
  clientNote?: string | null;
}

/**
 * Reserva que anota la profesional (SPEC 18): la que llegó por WhatsApp o
 * Instagram, o una clienta que pidió hora en persona.
 *
 * - Nace `confirmed`: la profesional ya habló con la clienta.
 * - Puede caer fuera del horario publicado (es su agenda), pero nunca encima
 *   de otra reserva activa: eso lo garantiza el constraint
 *   `bookings_no_overlap`, que el repositorio traduce a BookingSlotTakenError.
 * - Una clienta nueva sin cuenta se crea sin contraseña; sin correo, con uno
 *   de relleno al que nunca se envía nada. Si después se registra con su
 *   correo real, `RegisterClientUseCase` activa esa misma cuenta.
 */
export class CreateManualBookingUseCase {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly servicesRepository: ServicesRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: CreateManualBookingInput): Promise<Booking> {
    const variant = await this.servicesRepository.findVariantById(input.serviceVariantId, input.professionalId);
    if (!variant || !variant.active) {
      throw new ManualBookingVariantNotFoundError();
    }

    const clientUserId = await this.resolveClient(input.professionalId, input.client);
    const endsAt = new Date(input.startsAt.getTime() + variant.durationMinutes * 60_000);

    try {
      return await this.bookingRepository.create({
        professionalId: input.professionalId,
        clientUserId,
        staffId: input.staffId,
        serviceVariantId: variant.id,
        startsAt: input.startsAt,
        endsAt,
        priceClp: variant.priceClp,
        durationMinutes: variant.durationMinutes,
        clientNote: input.clientNote ?? null,
        status: "confirmed",
      });
    } catch (err) {
      if (err instanceof BookingSlotTakenError) throw new ManualBookingSlotTakenError();
      throw err;
    }
  }

  private async resolveClient(professionalId: string, client: ManualBookingClient): Promise<string> {
    if (client.kind === "existing") {
      // Solo clientas que ya reservaron con esta profesional: un id
      // cualquiera no sirve para agendar a nombre de otra persona.
      const stats = await this.bookingRepository.listClientStats(professionalId);
      if (!stats.some((stat) => stat.clientUserId === client.userId)) {
        throw new ManualBookingClientNotFoundError();
      }
      return client.userId;
    }

    if (!isValidPhone(client.phone)) {
      throw new InvalidPhoneError();
    }
    const phone = normalizePhone(client.phone);
    const email = client.email?.trim().toLowerCase() || null;

    if (email) {
      const byEmail = await this.userRepository.findByEmail(email);
      if (byEmail) {
        if (byEmail.role !== "client") throw new ManualBookingEmailTakenError();
        if (!byEmail.phone) await this.userRepository.updatePhone(byEmail.id, phone);
        return byEmail.id;
      }
    } else {
      const byPhone = await this.userRepository.findClientByPhone(phone);
      if (byPhone) return byPhone.id;
    }

    const created = await this.userRepository.create({
      email: email ?? placeholderEmail(crypto.randomUUID()),
      passwordHash: UNUSABLE_PASSWORD_HASH,
      name: client.name.trim(),
      phone,
      role: "client",
    });
    return created.id;
  }
}
