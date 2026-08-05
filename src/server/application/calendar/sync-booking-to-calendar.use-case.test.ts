import { describe, expect, it } from "vitest";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import { InMemoryServicesRepository } from "@/server/application/service/__fakes__/in-memory-services-repository";
import { InMemoryCalendarGateway } from "@/server/application/calendar/__fakes__/in-memory-calendar-gateway";
import { InMemoryGoogleCalendarConnectionRepository } from "@/server/application/calendar/__fakes__/in-memory-google-calendar-connection.repository";
import { SyncBookingToCalendarUseCase } from "@/server/application/calendar/sync-booking-to-calendar.use-case";

async function setup() {
  const bookingRepository = new InMemoryBookingRepository();
  const connectionRepository = new InMemoryGoogleCalendarConnectionRepository();
  const calendarGateway = new InMemoryCalendarGateway();
  const userRepository = new InMemoryUserRepository();
  const servicesRepository = new InMemoryServicesRepository();

  const client = await userRepository.create({
    email: "clienta@example.com",
    passwordHash: "hash",
    name: "Karla",
    role: "client",
  });

  const service = await servicesRepository.createService({ professionalId: "prof-1", name: "Manicure" });
  const variant = await servicesRepository.createVariant({
    serviceId: service.id,
    label: "Única",
    priceClp: 15_000,
    durationMinutes: 60,
  });

  const booking = await bookingRepository.create({
    professionalId: "prof-1",
    clientUserId: client.id,
    serviceVariantId: variant.id,
    startsAt: new Date("2026-08-10T13:00:00Z"),
    endsAt: new Date("2026-08-10T14:00:00Z"),
    priceClp: 15_000,
    durationMinutes: 60,
  });

  const useCase = new SyncBookingToCalendarUseCase(
    bookingRepository,
    connectionRepository,
    calendarGateway,
    userRepository,
    servicesRepository,
  );

  return { bookingRepository, connectionRepository, calendarGateway, useCase, booking, client, service };
}

describe("SyncBookingToCalendarUseCase", () => {
  it("no hace nada si no hay conexión", async () => {
    const { calendarGateway, useCase, booking } = await setup();

    await useCase.execute(booking.id);

    expect(calendarGateway.createdEvents).toHaveLength(0);
  });

  it("crea el evento y guarda el id cuando hay conexión activa", async () => {
    const { bookingRepository, connectionRepository, calendarGateway, useCase, booking, client, service } =
      await setup();
    await connectionRepository.upsert({
      professionalId: "prof-1",
      googleAccountEmail: "karla@gmail.com",
      refreshToken: "refresh-token",
    });

    await useCase.execute(booking.id);

    expect(calendarGateway.createdEvents).toHaveLength(1);
    expect(calendarGateway.createdEvents[0].draft.summary).toBe(`${service.name} — ${client.name}`);

    const updated = await bookingRepository.findById(booking.id);
    expect(updated?.googleEventId).toBe(calendarGateway.createdEvents[0].id);
  });

  it("marca la conexión como revocada si Google rechaza el token", async () => {
    const { connectionRepository, calendarGateway, useCase, booking } = await setup();
    await connectionRepository.upsert({
      professionalId: "prof-1",
      googleAccountEmail: "karla@gmail.com",
      refreshToken: "refresh-token",
    });
    calendarGateway.revokedForRefreshToken = "refresh-token";

    await useCase.execute(booking.id);

    const connection = await connectionRepository.findByProfessionalId("prof-1");
    expect(connection?.status).toBe("revoked");
  });
});
