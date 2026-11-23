import { describe, expect, it } from "vitest";
import {
  addDays,
  agendaHourRange,
  isLocalDate,
  localDateInZone,
  mondayOf,
  weekDates,
} from "@/server/domain/booking/agenda-week";

describe("agenda-week (SPEC 19)", () => {
  it("finds the Monday of the week, Sunday included", () => {
    expect(mondayOf("2026-08-12")).toBe("2026-08-10"); // miércoles
    expect(mondayOf("2026-08-10")).toBe("2026-08-10"); // lunes
    expect(mondayOf("2026-08-16")).toBe("2026-08-10"); // domingo
  });

  it("lists seven days across a month boundary", () => {
    expect(weekDates("2026-08-31")).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
    ]);
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("validates local dates", () => {
    expect(isLocalDate("2026-08-10")).toBe(true);
    expect(isLocalDate("2026-13-40")).toBe(false);
    expect(isLocalDate("ayer")).toBe(false);
    expect(isLocalDate(undefined)).toBe(false);
  });

  it("reads the local day in the professional's zone", () => {
    expect(localDateInZone(new Date("2026-08-11T03:30:00Z"), "America/Santiago")).toBe("2026-08-10");
  });

  it("widens the default 9-20 range to fit early or late bookings", () => {
    expect(agendaHourRange([])).toEqual({ startHour: 9, endHour: 20 });
    expect(agendaHourRange([{ start: 7 * 60 + 30, end: 8 * 60 + 30 }, { start: 20 * 60, end: 21 * 60 + 15 }])).toEqual({
      startHour: 7,
      endHour: 22,
    });
  });
});
