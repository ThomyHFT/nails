import type { ClientBookingStats } from "@/server/domain/booking/client-booking-stats.entity";
import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";

export class ListClientStatsUseCase {
  constructor(private readonly bookingRepository: BookingRepository) {}

  async execute(professionalId: string): Promise<ClientBookingStats[]> {
    return this.bookingRepository.listClientStats(professionalId);
  }
}
