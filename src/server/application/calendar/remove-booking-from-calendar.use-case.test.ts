import { describe, expect, it } from "vitest";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { InMemoryCalendarGateway } from "@/server/application/calendar/__fakes__/in-memory-calendar-gateway";
import { InMemoryGoogleCalendarConnectionRepository } from "@/server/application/calendar/__fakes__/in-memory-google-calendar-connection.repository";
import { RemoveBookingFromCalendarUseCase } from "@/server/application/calendar/remove-booking-from-calendar.use-case";

async function setup() {
  const bookingRepository = new InMemoryBookingRepository();
  const connectionRepository = new InMemoryGoogleCalendarConnectionRepository();
  const calendarGateway = new InMemoryCalendarGateway();

  const booking = await bookingRepository.create({
    professionalId: "prof-1",
    clientUserId: "client-1",
    serviceVariantId: "variant-1",
    startsAt: new Date("2026-08-10T13:00:00Z"),
    endsAt: new Date("2026-08-10T14:00:00Z"),
    priceClp: 15_000,
    durationMinutes: 60,
  });

  const useCase = new RemoveBookingFromCalendarUseCase(bookingRepository, connectionRepository, calendarGateway);

  return { bookingRepository, connectionRepository, calendarGateway, useCase, booking };
}

describe("RemoveBookingFromCalendarUseCase", () => {
  it("no hace nada si la reserva no tiene evento", async () => {
    const { calendarGateway, useCase, booking } = await setup();

    await useCase.execute(booking.id);

    expect(calendarGateway.deletedEventIds).toHaveLength(0);
  });

  it("borra el evento y limpia el id cuando la reserva tiene uno", async () => {
    const { bookingRepository, connectionRepository, calendarGateway, useCase, booking } = await setup();
    await connectionRepository.upsert({
      professionalId: "prof-1",
      googleAccountEmail: "karla@gmail.com",
      refreshToken: "refresh-token",
    });
    await bookingRepository.setGoogleEventId(booking.id, "event-123");

    await useCase.execute(booking.id);

    expect(calendarGateway.deletedEventIds).toEqual(["event-123"]);
    const updated = await bookingRepository.findById(booking.id);
    expect(updated?.googleEventId).toBeNull();
  });

  it("marca la conexión como revocada si Google rechaza el token", async () => {
    const { bookingRepository, connectionRepository, calendarGateway, useCase, booking } = await setup();
    await connectionRepository.upsert({
      professionalId: "prof-1",
      googleAccountEmail: "karla@gmail.com",
      refreshToken: "refresh-token",
    });
    await bookingRepository.setGoogleEventId(booking.id, "event-123");
    calendarGateway.revokedForRefreshToken = "refresh-token";

    await useCase.execute(booking.id);

    const connection = await connectionRepository.findByProfessionalId("prof-1");
    expect(connection?.status).toBe("revoked");
  });
});
