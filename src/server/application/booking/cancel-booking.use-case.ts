import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { Booking } from "@/server/domain/booking/booking.entity";
import { allowedFromStatuses, canApplyBookingAction } from "@/server/domain/booking/booking-transitions";
import {
  BookingInvalidStateError,
  BookingNotFoundError,
  BookingNotOwnedError,
} from "@/server/application/booking/booking-guard-errors";

export class CancelBookingByClientUseCase {
  constructor(private readonly bookingRepository: BookingRepository) {}

  async execute(bookingId: string, clientUserId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new BookingNotFoundError();
    if (booking.clientUserId !== clientUserId) throw new BookingNotOwnedError();
    if (!canApplyBookingAction(booking.status, "cancel")) throw new BookingInvalidStateError();

    const updated = await this.bookingRepository.cancel(bookingId, "client", allowedFromStatuses("cancel"));
    // null: la reserva cambió entre la lectura y esta escritura.
    if (!updated) throw new BookingInvalidStateError();
    return updated;
  }
}

/** Rechazar una pendiente o cancelar una confirmada son la misma acción vista desde la profesional. */
export class CancelBookingByProfessionalUseCase {
  constructor(private readonly bookingRepository: BookingRepository) {}

  async execute(bookingId: string, professionalId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new BookingNotFoundError();
    if (booking.professionalId !== professionalId) throw new BookingNotOwnedError();
    if (!canApplyBookingAction(booking.status, "cancel")) throw new BookingInvalidStateError();

    const updated = await this.bookingRepository.cancel(bookingId, "professional", allowedFromStatuses("cancel"));
    // null: la reserva cambió entre la lectura y esta escritura.
    if (!updated) throw new BookingInvalidStateError();
    return updated;
  }
}
