import { describe, expect, it } from "vitest";
import {
  minutesToTime,
  startOfDayInZone,
  timeToMinutes,
  utcToZonedMinutesOfDay,
  zonedDateTimeToUtc,
} from "@/server/application/booking/zoned-time";

describe("timeToMinutes / minutesToTime", () => {
  it("round-trips", () => {
    expect(timeToMinutes("09:30")).toBe(570);
    expect(minutesToTime(570)).toBe("09:30");
  });
});

describe("zonedDateTimeToUtc", () => {
  it("converts 10:00 Santiago (winter, UTC-4) to 14:00 UTC", () => {
    // Agosto es invierno en Chile: sin horario de verano, UTC-4 todo el año
    // desde que se suspendió el cambio.
    const instant = zonedDateTimeToUtc("2026-08-04", "10:00", "America/Santiago");
    expect(instant.toISOString()).toBe("2026-08-04T14:00:00.000Z");
  });
});

describe("startOfDayInZone", () => {
  it("returns Santiago midnight as a UTC instant", () => {
    const instant = startOfDayInZone(new Date("2026-08-04T18:00:00Z"), "America/Santiago");
    expect(instant.toISOString()).toBe("2026-08-04T04:00:00.000Z");
  });

  it("does not roll to the next day just because the runtime clock is UTC", () => {
    // 22:30 en Santiago (UTC-4) es 02:30 UTC del día siguiente. Un cálculo con
    // `now.getDate()` en un runtime UTC (Vercel) pensaría que ya es 5 de
    // agosto; acá "hoy" tiene que seguir siendo el 4.
    const lateNightInSantiago = new Date("2026-08-05T02:30:00Z");
    const instant = startOfDayInZone(lateNightInSantiago, "America/Santiago");
    expect(instant.toISOString()).toBe("2026-08-04T04:00:00.000Z");
  });

  it("does not roll to the previous day just because the runtime clock is behind UTC", () => {
    // 00:30 UTC ya son las 20:30 del día anterior en Santiago; "hoy" en
    // Santiago sigue siendo el día anterior al de la fecha UTC.
    const instant = startOfDayInZone(new Date("2026-08-05T00:30:00Z"), "America/Santiago");
    expect(instant.toISOString()).toBe("2026-08-04T04:00:00.000Z");
  });
});

describe("utcToZonedMinutesOfDay", () => {
  it("reads 14:00 UTC as 10:00 in Santiago", () => {
    expect(utcToZonedMinutesOfDay(new Date("2026-08-04T14:00:00Z"), "America/Santiago")).toBe(600);
  });
});
