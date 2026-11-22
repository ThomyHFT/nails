import type { AvailabilityRule } from "@/server/domain/availability/availability-rule.entity";

/**
 * Las reglas que valen para un mes (SPEC 18): si el mes tiene reglas propias,
 * reemplazan por completo al horario semanal; si no, rige el semanal. No se
 * mezclan: un mes con reglas propias es otro horario, no un parche encima.
 */
export function resolveRulesForMonth(monthRules: AvailabilityRule[], weeklyRules: AvailabilityRule[]): AvailabilityRule[] {
  return monthRules.length > 0 ? monthRules : weeklyRules;
}
