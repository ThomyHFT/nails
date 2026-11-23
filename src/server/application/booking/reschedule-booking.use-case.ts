import type { AvailabilityRepository } from "@/server/domain/availability/availability-repository.port";
import { BookingSlotTakenError, type BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { Booking } from "@/server/domain/booking/booking.entity";
import { allowedFromStatuses, canApplyBookingAction } from "@/server/domain/booking/booking-transitions";
import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import {
  BookingInvalidStateError,
  BookingNotFoundError,
  BookingNotOwnedError,
} from "@/server/application/booking/booking-guard-errors";
import { assertClientChangeAllowed } from "@/server/application/booking/cancel-booking.use-case";
import { SlotNotAvailableError } from "@/server/application/booking/create-booking.use-case";
import { GenerateAvailableSlotsUseCase } from "@/server/application/booking/generate-available-slots.use-case";
import { zonedDateTimeToUtc } from "@/server/application/booking/zoned-time";

export type RescheduleActor = { kind: "client"; userId: string } | { kind: "professional"; professionalId: string };

export interface RescheduleBookingInput {
  bookingId: string;
  actor: RescheduleActor;
  /** Fecha y hora locales de la profesional. */
  date: string;
  time: string;
  now?: Date;
}

export interface RescheduleBookingResult {
  booking: Booking;
  previousStartsAt: Date;
}

/**
 * Mover una reserva sin cancelarla (SPEC 19).
 *
 * - La clienta solo dentro del plazo de la profesional y a un horario que el
 *   motor ofrezca (sin contar su propia reserva como ocupada).
 * - La profesional, a cualquier hora que no choque con otra reserva activa:
 *   es su agenda, mismo criterio que la reserva manual.
 */
export class RescheduleBookingUseCase {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly availabilityRepository: AvailabilityRepository,
    private readonly professionalRepository: ProfessionalRepository,
  ) {}

  async execute(input: RescheduleBookingInput): Promise<RescheduleBookingResult> {
    const now = input.now ?? new Date();
    const booking = await this.bookingRepository.findById(input.bookingId);
    if (!booking) throw new BookingNotFoundError();

    const owns =
      input.actor.kind === "client"
        ? booking.clientUserId === input.actor.userId
        : booking.professionalId === input.actor.professionalId;
    if (!owns) throw new BookingNotOwnedError();
    if (!canApplyBookingAction(booking.status, "reschedule")) throw new BookingInvalidStateError();

    const professional = await this.professionalRepository.findById(booking.professionalId);
    if (!professional) throw new BookingNotFoundError();

    const startsAt = zonedDateTimeToUtc(input.date, input.time, professional.timezone);
    const endsAt = new Date(startsAt.getTime() + booking.durationMinutes * 60_000);

    if (input.actor.kind === "client") {
      await assertClientChangeAllowed(this.professionalRepository, booking, now);
      const slots = await new GenerateAvailableSlotsUseCase(this.availabilityRepository, this.bookingRepository).execute({
        professionalId: professional.id,
        timezone: professional.timezone,
        bufferMinutes: professional.bufferMinutes,
        date: input.date,
        durationMinutes: booking.durationMinutes,
        now,
        policy: professional.bookingPolicy,
        excludeBookingId: booking.id,
      });
      if (!slots.some((slot) => slot.startsAt === startsAt.toISOString())) {
        throw new SlotNotAvailableError();
      }
    }

    // Antes de escribir: después, la reserva ya tiene la hora nueva.
    const previousStartsAt = new Date(booking.startsAt);
    let updated: Booking | null;
    try {
      updated = await this.bookingRepository.reschedule(booking.id, startsAt, endsAt, allowedFromStatuses("reschedule"));
    } catch (err) {
      if (err instanceof BookingSlotTakenError) throw new SlotNotAvailableError();
      throw err;
    }
    if (!updated) throw new BookingInvalidStateError();

    return { booking: updated, previousStartsAt };
  }
}
