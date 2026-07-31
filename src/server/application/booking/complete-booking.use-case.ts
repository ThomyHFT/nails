import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { Booking } from "@/server/domain/booking/booking.entity";
import {
  BookingNotFoundError,
  BookingNotOwnedError,
  BookingTooEarlyError,
} from "@/server/application/booking/booking-guard-errors";

export class CompleteBookingUseCase {
  constructor(private readonly bookingRepository: BookingRepository) {}

  async execute(bookingId: string, professionalId: string, now: Date = new Date()): Promise<Booking> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new BookingNotFoundError();
    if (booking.professionalId !== professionalId) throw new BookingNotOwnedError();
    if (now < booking.endsAt) throw new BookingTooEarlyError();

    return this.bookingRepository.updateStatus(bookingId, "completed");
  }
}
