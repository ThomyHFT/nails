import { describe, expect, it } from "vitest";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { ListClientStatsUseCase } from "@/server/application/booking/list-client-stats.use-case";

const PROFESSIONAL_ID = "prof-1";

function makeUseCase() {
  const bookingRepository = new InMemoryBookingRepository();
  return { bookingRepository, useCase: new ListClientStatsUseCase(bookingRepository) };
}

describe("ListClientStatsUseCase", () => {
  it("aggregates bookings per client", async () => {
    const { bookingRepository, useCase } = makeUseCase();

    const b1 = await bookingRepository.create({
      professionalId: PROFESSIONAL_ID,
      clientUserId: "client-1",
      serviceVariantId: "variant-1",
      startsAt: new Date("2026-08-01T10:00:00Z"),
      endsAt: new Date("2026-08-01T10:45:00Z"),
      priceClp: 10_000,
      durationMinutes: 45,
    });
    await bookingRepository.updateStatus(b1.id, "completed");

    const b2 = await bookingRepository.create({
      professionalId: PROFESSIONAL_ID,
      clientUserId: "client-1",
      serviceVariantId: "variant-1",
      startsAt: new Date("2026-08-10T10:00:00Z"),
      endsAt: new Date("2026-08-10T10:45:00Z"),
      priceClp: 15_000,
      durationMinutes: 45,
    });
    await bookingRepository.cancel(b2.id, "client");

    const stats = await useCase.execute(PROFESSIONAL_ID);

    expect(stats).toHaveLength(1);
    expect(stats[0]).toMatchObject({
      clientUserId: "client-1",
      totalBookings: 2,
      completedBookings: 1,
      totalSpentClp: 10_000,
      strikes: 1,
    });
    expect(stats[0].lastBookingAt).toEqual(new Date("2026-08-10T10:00:00Z"));
  });

  it("never counts a cancelled booking's price as spend", async () => {
    const { bookingRepository, useCase } = makeUseCase();
    const booking = await bookingRepository.create({
      professionalId: PROFESSIONAL_ID,
      clientUserId: "client-1",
      serviceVariantId: "variant-1",
      startsAt: new Date("2026-08-01T10:00:00Z"),
      endsAt: new Date("2026-08-01T10:45:00Z"),
      priceClp: 20_000,
      durationMinutes: 45,
    });
    await bookingRepository.cancel(booking.id, "professional");

    const stats = await useCase.execute(PROFESSIONAL_ID);

    expect(stats[0].totalSpentClp).toBe(0);
    // Cancelada por la profesional, no por la clienta: no es un strike.
    expect(stats[0].strikes).toBe(0);
  });

  it("keeps clients from other professionals out of the list", async () => {
    const { bookingRepository, useCase } = makeUseCase();
    await bookingRepository.create({
      professionalId: "other-prof",
      clientUserId: "client-1",
      serviceVariantId: "variant-1",
      startsAt: new Date("2026-08-01T10:00:00Z"),
      endsAt: new Date("2026-08-01T10:45:00Z"),
      priceClp: 10_000,
      durationMinutes: 45,
    });

    const stats = await useCase.execute(PROFESSIONAL_ID);

    expect(stats).toEqual([]);
  });

  it("orders the most recent client first", async () => {
    const { bookingRepository, useCase } = makeUseCase();
    await bookingRepository.create({
      professionalId: PROFESSIONAL_ID,
      clientUserId: "client-older",
      serviceVariantId: "variant-1",
      startsAt: new Date("2026-08-01T10:00:00Z"),
      endsAt: new Date("2026-08-01T10:45:00Z"),
      priceClp: 10_000,
      durationMinutes: 45,
    });
    await bookingRepository.create({
      professionalId: PROFESSIONAL_ID,
      clientUserId: "client-newer",
      serviceVariantId: "variant-1",
      startsAt: new Date("2026-08-20T10:00:00Z"),
      endsAt: new Date("2026-08-20T10:45:00Z"),
      priceClp: 10_000,
      durationMinutes: 45,
    });

    const stats = await useCase.execute(PROFESSIONAL_ID);

    expect(stats.map((s) => s.clientUserId)).toEqual(["client-newer", "client-older"]);
  });
});
