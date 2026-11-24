import { describe, expect, it } from "vitest";
import { InMemoryAvailabilityRepository } from "@/server/application/booking/__fakes__/in-memory-availability-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { InMemoryDesignRepository } from "@/server/application/design/__fakes__/in-memory-design-repository";
import { CreateBookingUseCase } from "@/server/application/booking/create-booking.use-case";
import { GenerateAvailableSlotsUseCase } from "@/server/application/booking/generate-available-slots.use-case";
import { ListDaysWithSlotsUseCase } from "@/server/application/booking/list-days-with-slots.use-case";
import { DEFAULT_BOOKING_POLICY, isWithinClientChangeWindow } from "@/server/domain/professional/booking-policy";

const PROFESSIONAL_ID = "prof-1";
const NOW = new Date("2026-08-01T00:00:00Z");
const base = { professionalId: PROFESSIONAL_ID, staffId: "staff-1", timezone: "UTC", bufferMinutes: 0, now: NOW };

async function setup() {
  const availability = new InMemoryAvailabilityRepository();
  const bookings = new InMemoryBookingRepository();
  await availability.createRule({ professionalId: PROFESSIONAL_ID, weekday: 1, startTime: "09:00", endTime: "11:00", effectiveMonth: null });
  return { availability, bookings };
}

describe("booking policy (SPEC 19)", () => {
  it("offers slots every interval instead of every service duration", async () => {
    const { availability, bookings } = await setup();
    const slots = await new GenerateAvailableSlotsUseCase(availability, bookings).execute({
      ...base,
      date: "2026-08-10",
      durationMinutes: 45,
      policy: { ...DEFAULT_BOOKING_POLICY, slotIntervalMinutes: 30 },
    });

    expect(slots.map((slot) => slot.startsAt.slice(11, 16))).toEqual(["09:00", "09:30", "10:00"]);
  });

  it("keeps the old behavior (one slot per duration) without an interval", async () => {
    const { availability, bookings } = await setup();
    const slots = await new GenerateAvailableSlotsUseCase(availability, bookings).execute({
      ...base,
      date: "2026-08-10",
      durationMinutes: 45,
    });

    expect(slots.map((slot) => slot.startsAt.slice(11, 16))).toEqual(["09:00", "09:45"]);
  });

  it("does not offer days beyond the maximum advance", async () => {
    const { availability, bookings } = await setup();
    const days = await new ListDaysWithSlotsUseCase(availability, bookings).execute({
      ...base,
      month: "2026-08-01",
      durationMinutes: 60,
      policy: { ...DEFAULT_BOOKING_POLICY, maxAdvanceDays: 14 },
    });

    expect(days).toEqual(["2026-08-03", "2026-08-10"]);
  });

  it("applies a custom minimum lead time", async () => {
    const { availability, bookings } = await setup();
    const slots = await new GenerateAvailableSlotsUseCase(availability, bookings).execute({
      ...base,
      now: new Date("2026-08-10T08:00:00Z"),
      date: "2026-08-10",
      durationMinutes: 60,
      policy: { ...DEFAULT_BOOKING_POLICY, minLeadMinutes: 30 },
    });

    expect(slots.map((slot) => slot.startsAt.slice(11, 16))).toEqual(["09:00", "10:00"]);
  });

  it("creates the booking already confirmed when auto-confirm is on", async () => {
    const { availability, bookings } = await setup();
    const booking = await new CreateBookingUseCase(availability, bookings, new InMemoryDesignRepository()).execute({
      professionalId: PROFESSIONAL_ID,
      staffIds: ["staff-1"],
      professionalVertical: "nails",
      timezone: "UTC",
      bufferMinutes: 0,
      clientUserId: "client-1",
      serviceVariantId: "variant-1",
      date: "2026-08-10",
      startsAt: "2026-08-10T09:00:00.000Z",
      priceClp: 15_000,
      durationMinutes: 60,
      now: NOW,
      policy: { ...DEFAULT_BOOKING_POLICY, autoConfirm: true },
    });

    expect(booking.status).toBe("confirmed");
  });

  it("closes the client's change window inside the cancellation deadline", () => {
    const policy = { ...DEFAULT_BOOKING_POLICY, cancellationDeadlineHours: 24 };
    const startsAt = new Date("2026-08-10T09:00:00Z");

    expect(isWithinClientChangeWindow(policy, startsAt, new Date("2026-08-09T08:00:00Z"))).toBe(true);
    expect(isWithinClientChangeWindow(policy, startsAt, new Date("2026-08-09T10:00:00Z"))).toBe(false);
    expect(isWithinClientChangeWindow(DEFAULT_BOOKING_POLICY, startsAt, new Date("2026-08-10T08:59:00Z"))).toBe(true);
  });
});
