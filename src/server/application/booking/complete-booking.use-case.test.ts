import { describe, expect, it } from "vitest";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { BookingNotOwnedError, BookingTooEarlyError } from "@/server/application/booking/booking-guard-errors";
import { CompleteBookingUseCase } from "@/server/application/booking/complete-booking.use-case";

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

describe("CompleteBookingUseCase", () => {
  it("marks a booking as completed only after ends_at", async () => {
    const bookingRepository = new InMemoryBookingRepository();
    const booking = await makeBooking(bookingRepository, "prof-1");
    const useCase = new CompleteBookingUseCase(bookingRepository);

    const completed = await useCase.execute(booking.id, "prof-1", new Date("2026-08-10T10:01:00Z"));

    expect(completed.status).toBe("completed");
  });

  it("rejects completing a booking before ends_at", async () => {
    const bookingRepository = new InMemoryBookingRepository();
    const booking = await makeBooking(bookingRepository, "prof-1");
    const useCase = new CompleteBookingUseCase(bookingRepository);

    await expect(useCase.execute(booking.id, "prof-1", new Date("2026-08-10T09:30:00Z"))).rejects.toBeInstanceOf(
      BookingTooEarlyError,
    );
  });

  it("rejects completing a booking from another professional", async () => {
    const bookingRepository = new InMemoryBookingRepository();
    const booking = await makeBooking(bookingRepository, "prof-1");
    const useCase = new CompleteBookingUseCase(bookingRepository);

    await expect(
      useCase.execute(booking.id, "prof-2", new Date("2026-08-10T10:01:00Z")),
    ).rejects.toBeInstanceOf(BookingNotOwnedError);
  });
});
