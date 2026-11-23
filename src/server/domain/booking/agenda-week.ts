/**
 * Cálculos de calendario para la vista de agenda (SPEC 19). Trabaja con
 * fechas locales `YYYY-MM-DD` de la profesional: la conversión a instantes
 * la hace quien llama, con su zona horaria.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toUtcNoon(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

export function isLocalDate(value: string | undefined | null): value is string {
  return !!value && DATE_PATTERN.test(value) && !Number.isNaN(toUtcNoon(value).getTime());
}

export function addDays(date: string, days: number): string {
  const d = toUtcNoon(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Lunes de la semana de `date` (semana de lunes a domingo, como en Chile). */
export function mondayOf(date: string): string {
  const weekday = toUtcNoon(date).getUTCDay(); // 0 = domingo
  return addDays(date, weekday === 0 ? -6 : 1 - weekday);
}

export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function localDateInZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    instant,
  );
}

/**
 * Rango de horas que muestra la grilla: por defecto 9 a 20, ampliado para que
 * entre cualquier bloque (en minutos desde medianoche) que quede fuera.
 */
export function agendaHourRange(blocks: Array<{ start: number; end: number }>): { startHour: number; endHour: number } {
  let startHour = 9;
  let endHour = 20;
  for (const block of blocks) {
    startHour = Math.min(startHour, Math.floor(block.start / 60));
    endHour = Math.max(endHour, Math.ceil(block.end / 60));
  }
  return { startHour: Math.max(0, startHour), endHour: Math.min(24, endHour) };
}
