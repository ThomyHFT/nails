import { describe, expect, it } from "vitest";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { BookingNotOwnedError, BookingTooEarlyError } from "@/server/application/booking/booking-guard-errors";
import { MarkNoShowUseCase } from "@/server/application/booking/mark-no-show.use-case";

async function makeBooking(bookingRepository: InMemoryBookingRepository, professionalId: string) {
  return bookingRepository.create({
    professionalId,
    clientUserId: "client-1",
    serviceVariantId: "variant-1",
    startsAt: new Date("2026-08-10T09:00:00Z"),
    endsAt: new Date("2026-08-10T10:00:00Z"),
    priceClp: 15_000,
    durationMinutes: 60,
  });
}

describe("MarkNoShowUseCase", () => {
  it("marks a booking as no_show only after ends_at", async () => {
    const bookingRepository = new InMemoryBookingRepository();
    const booking = await makeBooking(bookingRepository, "prof-1");
    const useCase = new MarkNoShowUseCase(bookingRepository);

    const result = await useCase.execute(booking.id, "prof-1", new Date("2026-08-10T10:01:00Z"));

    expect(result.status).toBe("no_show");
  });

  it("rejects marking no_show before ends_at", async () => {
    const bookingRepository = new InMemoryBookingRepository();
    const booking = await makeBooking(bookingRepository, "prof-1");
    const useCase = new MarkNoShowUseCase(bookingRepository);

    await expect(useCase.execute(booking.id, "prof-1", new Date("2026-08-10T09:30:00Z"))).rejects.toBeInstanceOf(
      BookingTooEarlyError,
    );
  });

  it("rejects marking no_show on a booking from another professional", async () => {
    const bookingRepository = new InMemoryBookingRepository();
    const booking = await makeBooking(bookingRepository, "prof-1");
    const useCase = new MarkNoShowUseCase(bookingRepository);

    await expect(
      useCase.execute(booking.id, "prof-2", new Date("2026-08-10T10:01:00Z")),
    ).rejects.toBeInstanceOf(BookingNotOwnedError);
  });
});
