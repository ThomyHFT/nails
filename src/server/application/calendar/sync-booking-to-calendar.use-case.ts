import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { CalendarGateway } from "@/server/domain/calendar/calendar-gateway.port";
import { CalendarAccessRevokedError } from "@/server/domain/calendar/calendar-errors";
import type { GoogleCalendarConnectionRepository } from "@/server/domain/calendar/google-calendar-connection-repository.port";
import type { ServicesRepository } from "@/server/domain/service/services-repository.port";
import type { UserRepository } from "@/server/domain/user/user-repository.port";

const TIME_ZONE = "America/Santiago";

export class SyncBookingToCalendarUseCase {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly connectionRepository: GoogleCalendarConnectionRepository,
    private readonly calendarGateway: CalendarGateway,
    private readonly userRepository: UserRepository,
    private readonly servicesRepository: ServicesRepository,
  ) {}

  async execute(bookingId: string): Promise<void> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) return;

    const connection = await this.connectionRepository.findByProfessionalId(booking.professionalId);
    if (!connection || connection.status !== "active") return;

    const [client, variant] = await Promise.all([
      this.userRepository.findById(booking.clientUserId),
      this.servicesRepository.findVariantById(booking.serviceVariantId, booking.professionalId),
    ]);
    if (!client) return;

    const service = variant ? await this.servicesRepository.findById(variant.serviceId, booking.professionalId) : null;
    const serviceName = service?.name ?? "Servicio";

    const descriptionLines = [
      `Clienta: ${client.name}`,
      `Correo: ${client.email}`,
      `Precio: $${booking.priceClp.toLocaleString("es-CL")}`,
    ];
    if (booking.clientNote) descriptionLines.push(`Nota: ${booking.clientNote}`);

    try {
      const eventId = await this.calendarGateway.createEvent(connection.refreshToken, {
        summary: `${serviceName} — ${client.name}`,
        description: descriptionLines.join("\n"),
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        timeZone: TIME_ZONE,
      });
      await this.bookingRepository.setGoogleEventId(booking.id, eventId);
    } catch (error) {
      if (error instanceof CalendarAccessRevokedError) {
        await this.connectionRepository.markRevoked(booking.professionalId);
        return;
      }
      throw error;
    }
  }
}
