import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { Booking } from "@/server/domain/booking/booking.entity";
import { BookingNotFoundError, BookingNotOwnedError } from "@/server/application/booking/booking-guard-errors";

export class CancelBookingByClientUseCase {
  constructor(private readonly bookingRepository: BookingRepository) {}

  async execute(bookingId: string, clientUserId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new BookingNotFoundError();
    if (booking.clientUserId !== clientUserId) throw new BookingNotOwnedError();

    return this.bookingRepository.cancel(bookingId, "client");
  }
}
