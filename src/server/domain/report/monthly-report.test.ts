import { describe, expect, it } from "vitest";
import type { Booking, BookingStatus } from "@/server/domain/booking/booking.entity";
import { buildMonthlyReport, isMonth, previousMonth } from "@/server/domain/report/monthly-report";

let seq = 0;
function booking(startsAt: string, status: BookingStatus, clientUserId: string, priceClp = 10_000, variant = "v-mani"): Booking {
  const start = new Date(startsAt);
  return {
    id: String(++seq),
    professionalId: "p",
    clientUserId,
    serviceVariantId: variant,
    designId: null,
    startsAt: start,
    endsAt: new Date(start.getTime() + 3_600_000),
    status,
    priceClp,
    durationMinutes: 60,
    clientNote: null,
    professionalNote: null,
    cancelledAt: null,
    cancelledBy: status === "cancelled" ? "client" : null,
    googleEventId: null,
    depositClp: null,
    depositPaidAt: null,
    createdAt: start,
    updatedAt: start,
  };
}

const services = new Map([
  ["v-mani", "Manicure"],
  ["v-pedi", "Pedicure"],
]);

describe("buildMonthlyReport (SPEC 20)", () => {
  const bookings = [
    booking("2026-07-10T14:00:00Z", "completed", "ana", 12_000), // julio
    booking("2026-08-03T14:00:00Z", "completed", "ana", 15_000), // lunes, recurrente
    booking("2026-08-04T14:00:00Z", "completed", "bea", 20_000, "v-pedi"), // martes, nueva
    booking("2026-08-04T18:00:00Z", "no_show", "cami"), // martes, nueva
    booking("2026-08-05T14:00:00Z", "cancelled", "dani"), // no cuenta como clienta nueva
    booking("2026-08-20T14:00:00Z", "confirmed", "ana"),
    // 23:30 del 31 de agosto en Santiago es 1 de septiembre en UTC: va en agosto.
    booking("2026-09-01T03:30:00Z", "completed", "eli", 8_000),
    booking("2026-09-10T14:00:00Z", "completed", "fer"), // septiembre
  ];

  const report = buildMonthlyReport({ bookings, month: "2026-08", timezone: "America/Santiago", serviceNameByVariant: services });

  it("counts by status in the professional's local month", () => {
    expect(report.byStatus).toEqual({ pending: 0, confirmed: 1, completed: 3, cancelled: 1, no_show: 1 });
  });

  it("adds revenue only from completed bookings", () => {
    expect(report.revenueClp).toBe(43_000);
    expect(report.averageTicketClp).toBe(14_333);
    expect(report.noShowRate).toBeCloseTo(1 / 4);
  });

  it("splits new and returning clients, ignoring cancelled-only ones", () => {
    expect(report.newClients).toBe(3); // bea, cami, eli
    expect(report.returningClients).toBe(1); // ana
  });

  it("ranks services and counts by weekday", () => {
    expect(report.topServices[0]).toEqual({ name: "Manicure", bookings: 4, revenueClp: 23_000 });
    expect(report.topServices[1]).toEqual({ name: "Pedicure", bookings: 1, revenueClp: 20_000 });
    // Lunes: 3 y 31 de agosto. Martes: dos el 4. Jueves: el 20.
    expect(report.byWeekday).toEqual([2, 2, 0, 1, 0, 0, 0]);
  });

  it("compares with the previous month", () => {
    expect(report.previous).toEqual({ revenueClp: 12_000, completed: 1 });
  });

  it("handles month helpers", () => {
    expect(previousMonth("2026-01")).toBe("2025-12");
    expect(previousMonth("2026-10")).toBe("2026-09");
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("2026-08")).toBe(true);
  });

  it("reports an empty month without dividing by zero", () => {
    const empty = buildMonthlyReport({ bookings: [], month: "2026-08", timezone: "UTC", serviceNameByVariant: services });
    expect(empty.averageTicketClp).toBe(0);
    expect(empty.noShowRate).toBeNull();
  });
});
