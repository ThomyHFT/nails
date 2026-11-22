export interface AvailabilityRule {
  id: string;
  professionalId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  active: boolean;
  /** `null` = horario semanal (todos los meses); "YYYY-MM-01" = excepción de ese mes. */
  effectiveMonth: string | null;
}
