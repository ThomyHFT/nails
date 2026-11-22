import type { AvailabilityException, AvailabilityExceptionKind } from "@/server/domain/availability/availability-exception.entity";
import type { AvailabilityRule } from "@/server/domain/availability/availability-rule.entity";

export interface NewAvailabilityRule {
  professionalId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  /** `null` = horario semanal. */
  effectiveMonth: string | null;
}

export interface NewAvailabilityException {
  professionalId: string;
  date: string;
  kind: AvailabilityExceptionKind;
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
}

export interface AvailabilityRepository {
  /** `effectiveMonth = null` lista el horario semanal; un mes, solo sus reglas propias. */
  listRulesByProfessionalAndMonth(professionalId: string, effectiveMonth: string | null): Promise<AvailabilityRule[]>;
  createRule(rule: NewAvailabilityRule): Promise<AvailabilityRule>;
  deleteRule(id: string, professionalId: string): Promise<void>;
  deleteRulesByProfessionalAndMonth(professionalId: string, effectiveMonth: string | null): Promise<void>;
  listExceptionsByProfessionalAndDate(professionalId: string, date: string): Promise<AvailabilityException[]>;
  listExceptionsByProfessionalInMonth(professionalId: string, effectiveMonth: string): Promise<AvailabilityException[]>;
  createException(exception: NewAvailabilityException): Promise<AvailabilityException>;
  deleteException(id: string, professionalId: string): Promise<void>;
}
