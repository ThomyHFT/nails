import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { Booking } from "@/server/domain/booking/booking.entity";
import { canApplyBookingAction } from "@/server/domain/booking/booking-transitions";
import {
  BookingInvalidStateError,
  BookingNotFoundError,
  BookingNotOwnedError,
  BookingTooEarlyError,
} from "@/server/application/booking/booking-guard-errors";

export class MarkNoShowUseCase {
  constructor(private readonly bookingRepository: BookingRepository) {}

  async execute(bookingId: string, professionalId: string, now: Date = new Date()): Promise<Booking> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new BookingNotFoundError();
    if (booking.professionalId !== professionalId) throw new BookingNotOwnedError();
    if (!canApplyBookingAction(booking.status, "no_show")) throw new BookingInvalidStateError();
    if (now < booking.endsAt) throw new BookingTooEarlyError();

    return this.bookingRepository.updateStatus(bookingId, "no_show");
  }
}
