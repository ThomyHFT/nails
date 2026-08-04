import { describe, expect, it } from "vitest";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { BookingNotOwnedError } from "@/server/application/booking/booking-guard-errors";
import {
  CancelBookingByClientUseCase,
  CancelBookingByProfessionalUseCase,
} from "@/server/application/booking/cancel-booking.use-case";

async function makeBooking(bookingRepository: InMemoryBookingRepository, clientUserId: string) {
  return bookingRepository.create({
    professionalId: "prof-1",
    clientUserId,
    serviceVariantId: "variant-1",
    startsAt: new Date("2026-08-10T09:00:00Z"),
    endsAt: new Date("2026-08-10T10:00:00Z"),
    priceClp: 15_000,
    durationMinutes: 60,
  });
}

describe("CancelBookingByClientUseCase", () => {
  it("cancels the booking with cancelled_by = client, adding a strike", async () => {
    const bookingRepository = new InMemoryBookingRepository();
    const booking = await makeBooking(bookingRepository, "client-1");
    const useCase = new CancelBookingByClientUseCase(bookingRepository);

    const cancelled = await useCase.execute(booking.id, "client-1");

    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelledBy).toBe("client");
    expect(await bookingRepository.countClientStrikes("prof-1", "client-1")).toBe(1);
  });

  it("rejects cancelling a booking that belongs to another client", async () => {
    const bookingRepository = new InMemoryBookingRepository();
    const booking = await makeBooking(bookingRepository, "client-1");
    const useCase = new CancelBookingByClientUseCase(bookingRepository);

    await expect(useCase.execute(booking.id, "client-2")).rejects.toBeInstanceOf(BookingNotOwnedError);
  });

  it("does not count a strike when the professional cancels the booking", async () => {
    const bookingRepository = new InMemoryBookingRepository();
    const booking = await makeBooking(bookingRepository, "client-1");

    await bookingRepository.cancel(booking.id, "professional");

    expect(await bookingRepository.countClientStrikes("prof-1", "client-1")).toBe(0);
  });
});

describe("CancelBookingByProfessionalUseCase", () => {
  it("cancels the booking with cancelled_by = professional, without a strike", async () => {
    const bookingRepository = new InMemoryBookingRepository();
    const booking = await makeBooking(bookingRepository, "client-1");
    const useCase = new CancelBookingByProfessionalUseCase(bookingRepository);

    const cancelled = await useCase.execute(booking.id, "prof-1");

    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelledBy).toBe("professional");
    expect(await bookingRepository.countClientStrikes("prof-1", "client-1")).toBe(0);
  });

  it("rejects cancelling a booking that belongs to another professional", async () => {
    const bookingRepository = new InMemoryBookingRepository();
    const booking = await makeBooking(bookingRepository, "client-1");
    const useCase = new CancelBookingByProfessionalUseCase(bookingRepository);

    await expect(useCase.execute(booking.id, "prof-2")).rejects.toBeInstanceOf(BookingNotOwnedError);
  });
});
