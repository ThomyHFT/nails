import { describe, expect, it, vi } from "vitest";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { BookingInvalidStateError } from "@/server/application/booking/booking-guard-errors";
import {
  CancelBookingByClientUseCase,
  CancelBookingByProfessionalUseCase,
} from "@/server/application/booking/cancel-booking.use-case";
import { CompleteBookingUseCase } from "@/server/application/booking/complete-booking.use-case";
import { ConfirmBookingUseCase } from "@/server/application/booking/confirm-booking.use-case";
import { MarkNoShowUseCase } from "@/server/application/booking/mark-no-show.use-case";

const PROFESSIONAL_ID = "prof-1";
const CLIENT_ID = "client-1";
const AFTER_APPOINTMENT = new Date("2026-08-10T11:00:00Z");

async function makeBooking(bookingRepository: InMemoryBookingRepository) {
  return bookingRepository.create({
    professionalId: PROFESSIONAL_ID,
    clientUserId: CLIENT_ID,
    serviceVariantId: "variant-1",
    startsAt: new Date("2026-08-10T09:00:00Z"),
    endsAt: new Date("2026-08-10T10:00:00Z"),
    priceClp: 15_000,
    durationMinutes: 60,
  });
}

describe("booking state guards", () => {
  it("rejects confirming a booking the client already cancelled", async () => {
    const repo = new InMemoryBookingRepository();
    const booking = await makeBooking(repo);
    await new CancelBookingByClientUseCase(repo).execute(booking.id, CLIENT_ID);

    await expect(new ConfirmBookingUseCase(repo).execute(booking.id, PROFESSIONAL_ID)).rejects.toBeInstanceOf(
      BookingInvalidStateError,
    );
    expect((await repo.findById(booking.id))?.status).toBe("cancelled");
  });

  it("rejects confirming an already confirmed booking", async () => {
    const repo = new InMemoryBookingRepository();
    const booking = await makeBooking(repo);
    await new ConfirmBookingUseCase(repo).execute(booking.id, PROFESSIONAL_ID);

    await expect(new ConfirmBookingUseCase(repo).execute(booking.id, PROFESSIONAL_ID)).rejects.toBeInstanceOf(
      BookingInvalidStateError,
    );
  });

  it("rejects the client cancelling a completed booking", async () => {
    const repo = new InMemoryBookingRepository();
    const booking = await makeBooking(repo);
    await new CompleteBookingUseCase(repo).execute(booking.id, PROFESSIONAL_ID, AFTER_APPOINTMENT);

    await expect(new CancelBookingByClientUseCase(repo).execute(booking.id, CLIENT_ID)).rejects.toBeInstanceOf(
      BookingInvalidStateError,
    );
    expect(await repo.countClientStrikes(PROFESSIONAL_ID, CLIENT_ID)).toBe(0);
  });

  it("keeps the client's strike when the professional tries to cancel an already cancelled booking", async () => {
    const repo = new InMemoryBookingRepository();
    const booking = await makeBooking(repo);
    await new CancelBookingByClientUseCase(repo).execute(booking.id, CLIENT_ID);

    await expect(
      new CancelBookingByProfessionalUseCase(repo).execute(booking.id, PROFESSIONAL_ID),
    ).rejects.toBeInstanceOf(BookingInvalidStateError);
    expect(await repo.countClientStrikes(PROFESSIONAL_ID, CLIENT_ID)).toBe(1);
  });

  it("rejects completing a cancelled booking", async () => {
    const repo = new InMemoryBookingRepository();
    const booking = await makeBooking(repo);
    await new CancelBookingByClientUseCase(repo).execute(booking.id, CLIENT_ID);

    await expect(
      new CompleteBookingUseCase(repo).execute(booking.id, PROFESSIONAL_ID, AFTER_APPOINTMENT),
    ).rejects.toBeInstanceOf(BookingInvalidStateError);
  });

  it("rejects marking no_show on a completed booking", async () => {
    const repo = new InMemoryBookingRepository();
    const booking = await makeBooking(repo);
    await new CompleteBookingUseCase(repo).execute(booking.id, PROFESSIONAL_ID, AFTER_APPOINTMENT);

    await expect(
      new MarkNoShowUseCase(repo).execute(booking.id, PROFESSIONAL_ID, AFTER_APPOINTMENT),
    ).rejects.toBeInstanceOf(BookingInvalidStateError);
  });

  it("does not revive a booking the client cancelled between the professional's read and write", async () => {
    const repo = new InMemoryBookingRepository();
    const booking = await makeBooking(repo);
    const staleRead = { ...booking };
    // La profesional lee la reserva todavía pendiente...
    vi.spyOn(repo, "findById").mockResolvedValueOnce(staleRead);
    // ...y la clienta cancela antes de que llegue la escritura.
    await repo.cancel(booking.id, "client");

    await expect(new ConfirmBookingUseCase(repo).execute(booking.id, PROFESSIONAL_ID)).rejects.toBeInstanceOf(
      BookingInvalidStateError,
    );
    expect((await repo.findById(booking.id))?.status).toBe("cancelled");
    expect(await repo.countClientStrikes(PROFESSIONAL_ID, CLIENT_ID)).toBe(1);
  });
});
