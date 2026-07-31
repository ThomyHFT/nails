export interface AvailabilityRule {
  id: string;
  professionalId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  active: boolean;
  effectiveMonth: string;
}
