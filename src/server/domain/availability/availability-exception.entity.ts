export type AvailabilityExceptionKind = "blocked" | "extra";

export interface AvailabilityException {
  id: string;
  professionalId: string;
  date: string;
  kind: AvailabilityExceptionKind;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
}
