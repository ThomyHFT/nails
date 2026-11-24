export interface AvailabilityRule {
  id: string;
  professionalId: string;
  /** De quién es el horario (SPEC 22). */
  staffId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  active: boolean;
  /** `null` = horario semanal (todos los meses); "YYYY-MM-01" = excepción de ese mes. */
  effectiveMonth: string | null;
}
