import { describe, expect, it } from "vitest";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import { InMemoryServicesRepository } from "@/server/application/service/__fakes__/in-memory-services-repository";
import { InMemoryCalendarGateway } from "@/server/application/calendar/__fakes__/in-memory-calendar-gateway";
import { InMemoryGoogleCalendarConnectionRepository } from "@/server/application/calendar/__fakes__/in-memory-google-calendar-connection.repository";
import { SyncBookingToCalendarUseCase } from "@/server/application/calendar/sync-booking-to-calendar.use-case";
import { BackfillCalendarUseCase } from "@/server/application/calendar/backfill-calendar.use-case";

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

  await connectionRepository.upsert({
    professionalId: "prof-1",
    googleAccountEmail: "karla@gmail.com",
    refreshToken: "refresh-token",
  });

  const syncUseCase = new SyncBookingToCalendarUseCase(
    bookingRepository,
    connectionRepository,
    calendarGateway,
    userRepository,
    servicesRepository,
  );
  const backfillUseCase = new BackfillCalendarUseCase(bookingRepository, syncUseCase);

  return { bookingRepository, calendarGateway, backfillUseCase, client, variant };
}

describe("BackfillCalendarUseCase", () => {
  it("sube las reservas confirmadas futuras sin evento", async () => {
    const { bookingRepository, calendarGateway, backfillUseCase, client, variant } = await setup();
    const now = new Date("2026-08-05T12:00:00Z");

    const future1 = await bookingRepository.create({
      professionalId: "prof-1",
      clientUserId: client.id,
      serviceVariantId: variant.id,
      startsAt: new Date("2026-08-10T13:00:00Z"),
      endsAt: new Date("2026-08-10T14:00:00Z"),
      priceClp: 15_000,
      durationMinutes: 60,
    });
    await bookingRepository.updateStatus(future1.id, "confirmed");

    const future2 = await bookingRepository.create({
      professionalId: "prof-1",
      clientUserId: client.id,
      serviceVariantId: variant.id,
      startsAt: new Date("2026-08-12T13:00:00Z"),
      endsAt: new Date("2026-08-12T14:00:00Z"),
      priceClp: 15_000,
      durationMinutes: 60,
    });
    await bookingRepository.updateStatus(future2.id, "confirmed");

    const result = await backfillUseCase.execute("prof-1", now);

    expect(result).toEqual({ attempted: 2, synced: 2 });
    expect(calendarGateway.createdEvents).toHaveLength(2);
  });

  it("no sube reservas cuya hora ya pasó", async () => {
    const { bookingRepository, calendarGateway, backfillUseCase, client, variant } = await setup();
    const now = new Date("2026-08-05T12:00:00Z");

    const past = await bookingRepository.create({
      professionalId: "prof-1",
      clientUserId: client.id,
      serviceVariantId: variant.id,
      startsAt: new Date("2026-08-01T13:00:00Z"),
      endsAt: new Date("2026-08-01T14:00:00Z"),
      priceClp: 15_000,
      durationMinutes: 60,
    });
    await bookingRepository.updateStatus(past.id, "confirmed");

    const result = await backfillUseCase.execute("prof-1", now);

    expect(result).toEqual({ attempted: 0, synced: 0 });
    expect(calendarGateway.createdEvents).toHaveLength(0);
  });

  it("no vuelve a subir una reserva que ya tiene evento", async () => {
    const { bookingRepository, calendarGateway, backfillUseCase, client, variant } = await setup();
    const now = new Date("2026-08-05T12:00:00Z");

    const booking = await bookingRepository.create({
      professionalId: "prof-1",
      clientUserId: client.id,
      serviceVariantId: variant.id,
      startsAt: new Date("2026-08-10T13:00:00Z"),
      endsAt: new Date("2026-08-10T14:00:00Z"),
      priceClp: 15_000,
      durationMinutes: 60,
    });
    await bookingRepository.updateStatus(booking.id, "confirmed");
    await bookingRepository.setGoogleEventId(booking.id, "already-there");

    const result = await backfillUseCase.execute("prof-1", now);

    expect(result).toEqual({ attempted: 0, synced: 0 });
    expect(calendarGateway.createdEvents).toHaveLength(0);
  });
});
