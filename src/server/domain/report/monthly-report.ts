import type { Booking, BookingStatus } from "@/server/domain/booking/booking.entity";

/**
 * Reporte del mes de una profesional (SPEC 20). Función pura: recibe todas
 * sus reservas (hace falta la historia completa para saber quién es clienta
 * nueva) y agrupa por mes local en su zona horaria.
 */
export interface MonthlyReport {
  month: string; // YYYY-MM
  byStatus: Record<BookingStatus, number>;
  /** Suma de `price_clp` de las completadas: lo que de verdad se cobró. */
  revenueClp: number;
  averageTicketClp: number;
  /** no_show / (completadas + no_show); null si no hubo citas que cerrar. */
  noShowRate: number | null;
  newClients: number;
  returningClients: number;
  topServices: Array<{ name: string; bookings: number; revenueClp: number }>;
  /** Reservas no canceladas por día de la semana, lunes primero. */
  byWeekday: number[];
  previous: { revenueClp: number; completed: number };
}

const STATUSES: BookingStatus[] = ["pending", "confirmed", "completed", "cancelled", "no_show"];

function localParts(instant: Date, timeZone: string): { month: string; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    weekday: "short",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  return { month: `${get("year")}-${get("month")}`, weekday };
}

export function previousMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return m === 1 ? `${year - 1}-12` : `${year}-${String(m - 1).padStart(2, "0")}`;
}

export function isMonth(value: string | undefined | null): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function buildMonthlyReport(input: {
  bookings: Booking[];
  month: string;
  timezone: string;
  serviceNameByVariant: Map<string, string>;
}): MonthlyReport {
  const { bookings, month, timezone } = input;
  const prev = previousMonth(month);

  const firstBookingMonth = new Map<string, string>();
  const located = bookings.map((booking) => ({ booking, ...localParts(booking.startsAt, timezone) }));
  for (const { booking, month: m } of [...located].sort((a, b) => a.booking.startsAt.getTime() - b.booking.startsAt.getTime())) {
    if (booking.status === "cancelled") continue;
    if (!firstBookingMonth.has(booking.clientUserId)) firstBookingMonth.set(booking.clientUserId, m);
  }

  const inMonth = located.filter((l) => l.month === month);
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<BookingStatus, number>;
  for (const { booking } of inMonth) byStatus[booking.status] += 1;

  const completed = inMonth.filter((l) => l.booking.status === "completed");
  const revenueClp = completed.reduce((sum, l) => sum + l.booking.priceClp, 0);
  const closed = byStatus.completed + byStatus.no_show;

  const activeInMonth = inMonth.filter((l) => l.booking.status !== "cancelled");
  const clientsInMonth = new Set(activeInMonth.map((l) => l.booking.clientUserId));
  let newClients = 0;
  for (const clientId of clientsInMonth) if (firstBookingMonth.get(clientId) === month) newClients += 1;

  const services = new Map<string, { name: string; bookings: number; revenueClp: number }>();
  for (const { booking } of activeInMonth) {
    const name = input.serviceNameByVariant.get(booking.serviceVariantId) ?? "Otro";
    const entry = services.get(name) ?? { name, bookings: 0, revenueClp: 0 };
    entry.bookings += 1;
    if (booking.status === "completed") entry.revenueClp += booking.priceClp;
    services.set(name, entry);
  }

  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  for (const { weekday } of activeInMonth) if (weekday >= 0) byWeekday[weekday] += 1;

  const prevCompleted = located.filter((l) => l.month === prev && l.booking.status === "completed");

  return {
    month,
    byStatus,
    revenueClp,
    averageTicketClp: completed.length ? Math.round(revenueClp / completed.length) : 0,
    noShowRate: closed ? byStatus.no_show / closed : null,
    newClients,
    returningClients: clientsInMonth.size - newClients,
    topServices: [...services.values()].sort((a, b) => b.bookings - a.bookings || b.revenueClp - a.revenueClp).slice(0, 5),
    byWeekday,
    previous: { revenueClp: prevCompleted.reduce((sum, l) => sum + l.booking.priceClp, 0), completed: prevCompleted.length },
  };
}
