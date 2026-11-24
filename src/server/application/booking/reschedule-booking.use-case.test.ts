import { DEFAULT_PROFESSIONAL_COMMERCE } from "@/server/domain/professional/commerce";
import { describe, expect, it } from "vitest";
import { InMemoryAvailabilityRepository } from "@/server/application/booking/__fakes__/in-memory-availability-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { InMemoryProfessionalRepository } from "@/server/application/professional/__fakes__/in-memory-professional-repository";
import { makeProfessional } from "@/server/application/admin/__fakes__/professional-fixture";
import {
  BookingInvalidStateError,
  BookingNotOwnedError,
  ClientChangeWindowClosedError,
} from "@/server/application/booking/booking-guard-errors";
import { SlotNotAvailableError } from "@/server/application/booking/create-booking.use-case";
import { RescheduleBookingUseCase } from "@/server/application/booking/reschedule-booking.use-case";
import { DEFAULT_BOOKING_POLICY } from "@/server/domain/professional/booking-policy";

const PROFESSIONAL_ID = "professional-1";
const NOW = new Date("2026-08-01T00:00:00Z");

async function setup(deadlineHours = 0, slotIntervalMinutes: number | null = null) {
  const bookings = new InMemoryBookingRepository();
  const availability = new InMemoryAvailabilityRepository();
  const professionals = new InMemoryProfessionalRepository();
  professionals.professionals.push(
    makeProfessional({
      id: PROFESSIONAL_ID,
      timezone: "UTC",
      bookingPolicy: { ...DEFAULT_BOOKING_POLICY, cancellationDeadlineHours: deadlineHours, slotIntervalMinutes },
      commerce: DEFAULT_PROFESSIONAL_COMMERCE,
      plan: "solo",
      staffLimit: 1,
    }),
  );
  await availability.createRule({ professionalId: PROFESSIONAL_ID, weekday: 1, startTime: "09:00", endTime: "12:00", effectiveMonth: null });
  const booking = await bookings.create({
    professionalId: PROFESSIONAL_ID,
    clientUserId: "client-1",
    serviceVariantId: "variant-1",
    startsAt: new Date("2026-08-10T09:00:00Z"),
    endsAt: new Date("2026-08-10T10:00:00Z"),
    priceClp: 15_000,
    durationMinutes: 60,
  });
  return { bookings, booking, useCase: new RescheduleBookingUseCase(bookings, availability, professionals) };
}

describe("RescheduleBookingUseCase (SPEC 19)", () => {
  it("lets the client move her booking to a free slot on another day", async () => {
    const { useCase, booking } = await setup();

    const { booking: moved, previousStartsAt } = await useCase.execute({
      bookingId: booking.id,
      actor: { kind: "client", userId: "client-1" },
      date: "2026-08-17",
      time: "10:00",
      now: NOW,
    });

    expect(moved.startsAt.toISOString()).toBe("2026-08-17T10:00:00.000Z");
    expect(moved.endsAt.toISOString()).toBe("2026-08-17T11:00:00.000Z");
    expect(previousStartsAt.toISOString()).toBe("2026-08-10T09:00:00.000Z");
  });

  it("rejects a client slot outside the published schedule", async () => {
    const { useCase, booking } = await setup();

    await expect(
      useCase.execute({ bookingId: booking.id, actor: { kind: "client", userId: "client-1" }, date: "2026-08-17", time: "18:00", now: NOW }),
    ).rejects.toBeInstanceOf(SlotNotAvailableError);
  });

  it("lets the professional move it outside the published schedule", async () => {
    const { useCase, booking } = await setup();

    const { booking: moved } = await useCase.execute({
      bookingId: booking.id,
      actor: { kind: "professional", professionalId: PROFESSIONAL_ID },
      date: "2026-08-12",
      time: "18:00",
      now: NOW,
    });

    expect(moved.startsAt.toISOString()).toBe("2026-08-12T18:00:00.000Z");
  });

  it("blocks the client inside the cancellation deadline but not the professional", async () => {
    const { useCase, booking } = await setup(24);
    const lateNow = new Date("2026-08-09T20:00:00Z");

    await expect(
      useCase.execute({ bookingId: booking.id, actor: { kind: "client", userId: "client-1" }, date: "2026-08-17", time: "10:00", now: lateNow }),
    ).rejects.toBeInstanceOf(ClientChangeWindowClosedError);

    await expect(
      useCase.execute({ bookingId: booking.id, actor: { kind: "professional", professionalId: PROFESSIONAL_ID }, date: "2026-08-17", time: "10:00", now: lateNow }),
    ).resolves.toBeDefined();
  });

  it("does not let another client or another professional move it", async () => {
    const { useCase, booking } = await setup();

    await expect(
      useCase.execute({ bookingId: booking.id, actor: { kind: "client", userId: "client-2" }, date: "2026-08-17", time: "10:00", now: NOW }),
    ).rejects.toBeInstanceOf(BookingNotOwnedError);
    await expect(
      useCase.execute({ bookingId: booking.id, actor: { kind: "professional", professionalId: "other" }, date: "2026-08-17", time: "10:00", now: NOW }),
    ).rejects.toBeInstanceOf(BookingNotOwnedError);
  });

  it("does not move a cancelled booking", async () => {
    const { useCase, bookings, booking } = await setup();
    await bookings.cancel(booking.id, "client");

    await expect(
      useCase.execute({ bookingId: booking.id, actor: { kind: "client", userId: "client-1" }, date: "2026-08-17", time: "10:00", now: NOW }),
    ).rejects.toBeInstanceOf(BookingInvalidStateError);
  });

  it("does not count the booking being moved as busy, so it can shift half an hour", async () => {
    const { useCase, booking } = await setup(0, 30);

    const { booking: moved } = await useCase.execute({
      bookingId: booking.id,
      actor: { kind: "client", userId: "client-1" },
      date: "2026-08-10",
      time: "09:30",
      now: NOW,
    });

    expect(moved.startsAt.toISOString()).toBe("2026-08-10T09:30:00.000Z");
  });
});
