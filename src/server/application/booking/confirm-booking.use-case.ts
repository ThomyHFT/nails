import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { Booking } from "@/server/domain/booking/booking.entity";
import { allowedFromStatuses, canApplyBookingAction } from "@/server/domain/booking/booking-transitions";
import {
  BookingInvalidStateError,
  BookingNotFoundError,
  BookingNotOwnedError,
} from "@/server/application/booking/booking-guard-errors";

export class ConfirmBookingUseCase {
  constructor(private readonly bookingRepository: BookingRepository) {}

  async execute(bookingId: string, professionalId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new BookingNotFoundError();
    if (booking.professionalId !== professionalId) throw new BookingNotOwnedError();
    if (!canApplyBookingAction(booking.status, "confirm")) throw new BookingInvalidStateError();

    const updated = await this.bookingRepository.updateStatus(bookingId, "confirmed", allowedFromStatuses("confirm"));
    // null: la reserva cambió entre la lectura y esta escritura.
    if (!updated) throw new BookingInvalidStateError();
    return updated;
  }
}
