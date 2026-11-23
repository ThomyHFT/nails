/**
 * Cómo se reserva con una profesional (SPEC 19). Vive en `professionals`
 * porque es una sola por tenant; se agrupa en el dominio para pasarla entera
 * al motor de horarios y a los casos de uso sin arrastrar campo por campo.
 */
export interface BookingPolicy {
  /** La reserva de la clienta nace `confirmed` en vez de `pending`. */
  autoConfirm: boolean;
  /** Cada cuánto se ofrece un horario. `null` = cada duración del servicio. */
  slotIntervalMinutes: number | null;
  /** Antelación mínima para reservar. Antes era un 2 h fijo. */
  minLeadMinutes: number;
  /** Cuántos días hacia adelante se puede reservar. `null` = sin límite. */
  maxAdvanceDays: number | null;
  /** La clienta puede cancelar o reagendar hasta N horas antes. `0` = siempre. */
  cancellationDeadlineHours: number;
}

export const DEFAULT_BOOKING_POLICY: BookingPolicy = {
  autoConfirm: false,
  slotIntervalMinutes: null,
  minLeadMinutes: 120,
  maxAdvanceDays: null,
  cancellationDeadlineHours: 0,
};

/** Si la clienta todavía puede cancelar o reagendar una reserva que empieza en `startsAt`. */
export function isWithinClientChangeWindow(policy: BookingPolicy, startsAt: Date, now: Date = new Date()): boolean {
  if (policy.cancellationDeadlineHours <= 0) return true;
  return startsAt.getTime() - now.getTime() >= policy.cancellationDeadlineHours * 60 * 60 * 1000;
}
