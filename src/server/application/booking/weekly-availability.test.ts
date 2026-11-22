import { describe, expect, it } from "vitest";
import { InMemoryAvailabilityRepository } from "@/server/application/booking/__fakes__/in-memory-availability-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { GenerateAvailableSlotsUseCase } from "@/server/application/booking/generate-available-slots.use-case";
import { ListDaysWithSlotsUseCase } from "@/server/application/booking/list-days-with-slots.use-case";

const PROFESSIONAL_ID = "prof-1";
const NOW = new Date("2026-08-01T00:00:00Z");
const base = { professionalId: PROFESSIONAL_ID, timezone: "UTC", bufferMinutes: 0, durationMinutes: 60, now: NOW };

function make() {
  const availability = new InMemoryAvailabilityRepository();
  const bookings = new InMemoryBookingRepository();
  return {
    availability,
    days: new ListDaysWithSlotsUseCase(availability, bookings),
    slots: new GenerateAvailableSlotsUseCase(availability, bookings),
  };
}

describe("weekly availability (SPEC 18)", () => {
  it("applies the weekly schedule to any month without loading it again", async () => {
    const { availability, days } = make();
    await availability.createRule({ professionalId: PROFESSIONAL_ID, weekday: 1, startTime: "09:00", endTime: "12:00", effectiveMonth: null });

    expect(await days.execute({ ...base, month: "2026-08-01" })).toEqual([
      "2026-08-03",
      "2026-08-10",
      "2026-08-17",
      "2026-08-24",
      "2026-08-31",
    ]);
    expect(await days.execute({ ...base, month: "2026-12-01" })).toHaveLength(4);
  });

  it("lets a month-specific schedule replace the weekly one for that month only", async () => {
    const { availability, days } = make();
    await availability.createRule({ professionalId: PROFESSIONAL_ID, weekday: 1, startTime: "09:00", endTime: "12:00", effectiveMonth: null });
    // Diciembre: solo viernes.
    await availability.createRule({ professionalId: PROFESSIONAL_ID, weekday: 5, startTime: "10:00", endTime: "13:00", effectiveMonth: "2026-12-01" });

    const december = await days.execute({ ...base, month: "2026-12-01" });
    expect(december.every((date) => new Date(`${date}T00:00:00Z`).getUTCDay() === 5)).toBe(true);
    expect(december).toHaveLength(4);

    const november = await days.execute({ ...base, month: "2026-11-01" });
    expect(november.every((date) => new Date(`${date}T00:00:00Z`).getUTCDay() === 1)).toBe(true);
  });

  it("removes only the blocked hours when a block has a time range", async () => {
    const { availability, slots } = make();
    await availability.createRule({ professionalId: PROFESSIONAL_ID, weekday: 1, startTime: "09:00", endTime: "13:00", effectiveMonth: null });
    await availability.createException({ professionalId: PROFESSIONAL_ID, date: "2026-08-10", kind: "blocked", startTime: "10:00", endTime: "12:00" });

    const result = await slots.execute({ ...base, date: "2026-08-10" });

    expect(result.map((slot) => slot.startsAt)).toEqual(["2026-08-10T09:00:00.000Z", "2026-08-10T12:00:00.000Z"]);
  });

  it("still blocks the whole day when a block has no hours", async () => {
    const { availability, slots } = make();
    await availability.createRule({ professionalId: PROFESSIONAL_ID, weekday: 1, startTime: "09:00", endTime: "13:00", effectiveMonth: null });
    await availability.createException({ professionalId: PROFESSIONAL_ID, date: "2026-08-10", kind: "blocked" });

    expect(await slots.execute({ ...base, date: "2026-08-10" })).toEqual([]);
  });
});
