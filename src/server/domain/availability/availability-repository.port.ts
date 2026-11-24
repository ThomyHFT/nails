import type { AvailabilityException, AvailabilityExceptionKind } from "@/server/domain/availability/availability-exception.entity";
import type { AvailabilityRule } from "@/server/domain/availability/availability-rule.entity";

export interface NewAvailabilityRule {
  professionalId: string;
  /** De quién es el horario (SPEC 22). */
  staffId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  /** `null` = horario semanal. */
  effectiveMonth: string | null;
}

export interface NewAvailabilityException {
  professionalId: string;
  staffId: string;
  date: string;
  kind: AvailabilityExceptionKind;
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
}

/**
 * Horario y bloqueos, por integrante (SPEC 22). Las lecturas van por
 * `staffId`; las escrituras y borrados llevan además `professionalId` para no
 * tocar nunca la agenda de otro negocio.
 */
export interface AvailabilityRepository {
  /** `effectiveMonth = null` lista el horario semanal; un mes, solo sus reglas propias. */
  listRules(staffId: string, effectiveMonth: string | null): Promise<AvailabilityRule[]>;
  createRule(rule: NewAvailabilityRule): Promise<AvailabilityRule>;
  deleteRule(id: string, professionalId: string): Promise<void>;
  deleteRules(professionalId: string, staffId: string, effectiveMonth: string | null): Promise<void>;
  listExceptionsByDate(staffId: string, date: string): Promise<AvailabilityException[]>;
  listExceptionsInMonth(staffId: string, effectiveMonth: string): Promise<AvailabilityException[]>;
  createException(exception: NewAvailabilityException): Promise<AvailabilityException>;
  deleteException(id: string, professionalId: string): Promise<void>;
}
