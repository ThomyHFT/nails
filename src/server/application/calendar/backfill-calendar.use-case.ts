import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import { SyncBookingToCalendarUseCase } from "@/server/application/calendar/sync-booking-to-calendar.use-case";

export interface BackfillResult {
  attempted: number;
  synced: number;
}

export class BackfillCalendarUseCase {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly syncBookingToCalendarUseCase: SyncBookingToCalendarUseCase,
  ) {}

  async execute(professionalId: string, now: Date = new Date()): Promise<BackfillResult> {
    const bookings = await this.bookingRepository.listConfirmedFutureWithoutCalendarEvent(professionalId, now);

    let synced = 0;
    for (const booking of bookings) {
      await this.syncBookingToCalendarUseCase.execute(booking.id);
      const updated = await this.bookingRepository.findById(booking.id);
      if (updated?.googleEventId) synced += 1;
    }

    return { attempted: bookings.length, synced };
  }
}
