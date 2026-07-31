import { describe, expect, it } from "vitest";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { BookingNotOwnedError } from "@/server/application/booking/booking-guard-errors";
import { ConfirmBookingUseCase } from "@/server/application/booking/confirm-booking.use-case";

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

describe("ConfirmBookingUseCase", () => {
  it("confirms a pending booking that belongs to the professional", async () => {
    const bookingRepository = new InMemoryBookingRepository();
    const booking = await makeBooking(bookingRepository, "prof-1");
    const useCase = new ConfirmBookingUseCase(bookingRepository);

    const confirmed = await useCase.execute(booking.id, "prof-1");

    expect(confirmed.status).toBe("confirmed");
  });

  it("rejects confirming a booking that belongs to another professional", async () => {
    const bookingRepository = new InMemoryBookingRepository();
    const booking = await makeBooking(bookingRepository, "prof-1");
    const useCase = new ConfirmBookingUseCase(bookingRepository);

    await expect(useCase.execute(booking.id, "prof-2")).rejects.toBeInstanceOf(BookingNotOwnedError);
  });
});
