import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { CalendarGateway } from "@/server/domain/calendar/calendar-gateway.port";
import { CalendarAccessRevokedError } from "@/server/domain/calendar/calendar-errors";
import type { GoogleCalendarConnectionRepository } from "@/server/domain/calendar/google-calendar-connection-repository.port";

export class RemoveBookingFromCalendarUseCase {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly connectionRepository: GoogleCalendarConnectionRepository,
    private readonly calendarGateway: CalendarGateway,
  ) {}

  async execute(bookingId: string): Promise<void> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking || !booking.googleEventId) return;

    const connection = await this.connectionRepository.findByProfessionalId(booking.professionalId);
    if (!connection || connection.status !== "active") return;

    try {
      await this.calendarGateway.deleteEvent(connection.refreshToken, booking.googleEventId);
      await this.bookingRepository.setGoogleEventId(booking.id, null);
    } catch (error) {
      if (error instanceof CalendarAccessRevokedError) {
        await this.connectionRepository.markRevoked(booking.professionalId);
        return;
      }
      throw error;
    }
  }
}
