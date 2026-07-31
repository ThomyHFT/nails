import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { availabilityExceptions, availabilityRules } from "@/server/infrastructure/db/schema/availability";
import type { AvailabilityException } from "@/server/domain/availability/availability-exception.entity";
import type { AvailabilityRule } from "@/server/domain/availability/availability-rule.entity";
import type {
  AvailabilityRepository,
  NewAvailabilityException,
  NewAvailabilityRule,
} from "@/server/domain/availability/availability-repository.port";

function ruleToDomain(row: typeof availabilityRules.$inferSelect): AvailabilityRule {
  return {
    id: row.id,
    professionalId: row.professionalId,
    weekday: row.weekday,
    startTime: row.startTime,
    endTime: row.endTime,
    active: row.active,
    effectiveMonth: row.effectiveMonth,
  };
}

function exceptionToDomain(row: typeof availabilityExceptions.$inferSelect): AvailabilityException {
  return {
    id: row.id,
    professionalId: row.professionalId,
    date: row.date,
    kind: row.kind,
    startTime: row.startTime,
    endTime: row.endTime,
    note: row.note,
  };
}

function nextMonthStart(effectiveMonth: string): string {
  const [year, month] = effectiveMonth.split("-").map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  return next.toISOString().slice(0, 10);
}

export class DrizzleAvailabilityRepository implements AvailabilityRepository {
  async listRulesByProfessionalAndMonth(professionalId: string, effectiveMonth: string): Promise<AvailabilityRule[]> {
    const rows = await db
      .select()
      .from(availabilityRules)
      .where(
        and(
          eq(availabilityRules.professionalId, professionalId),
          eq(availabilityRules.effectiveMonth, effectiveMonth),
        ),
      );
    return rows.map(ruleToDomain);
  }

  async createRule(rule: NewAvailabilityRule): Promise<AvailabilityRule> {
    const [row] = await db
      .insert(availabilityRules)
      .values({
        professionalId: rule.professionalId,
        weekday: rule.weekday,
        startTime: rule.startTime,
        endTime: rule.endTime,
        effectiveMonth: rule.effectiveMonth,
      })
      .returning();
    return ruleToDomain(row);
  }

  async deleteRule(id: string, professionalId: string): Promise<void> {
    await db
      .delete(availabilityRules)
      .where(and(eq(availabilityRules.id, id), eq(availabilityRules.professionalId, professionalId)));
  }

  async deleteRulesByProfessionalAndMonth(professionalId: string, effectiveMonth: string): Promise<void> {
    await db
      .delete(availabilityRules)
      .where(
        and(
          eq(availabilityRules.professionalId, professionalId),
          eq(availabilityRules.effectiveMonth, effectiveMonth),
        ),
      );
  }

  async listExceptionsByProfessionalAndDate(professionalId: string, date: string): Promise<AvailabilityException[]> {
    const rows = await db
      .select()
      .from(availabilityExceptions)
      .where(and(eq(availabilityExceptions.professionalId, professionalId), eq(availabilityExceptions.date, date)));
    return rows.map(exceptionToDomain);
  }

  async listExceptionsByProfessionalInMonth(
    professionalId: string,
    effectiveMonth: string,
  ): Promise<AvailabilityException[]> {
    const rows = await db
      .select()
      .from(availabilityExceptions)
      .where(
        and(
          eq(availabilityExceptions.professionalId, professionalId),
          gte(availabilityExceptions.date, effectiveMonth),
          lt(availabilityExceptions.date, nextMonthStart(effectiveMonth)),
        ),
      );
    return rows.map(exceptionToDomain);
  }

  async createException(exception: NewAvailabilityException): Promise<AvailabilityException> {
    const [row] = await db
      .insert(availabilityExceptions)
      .values({
        professionalId: exception.professionalId,
        date: exception.date,
        kind: exception.kind,
        startTime: exception.startTime ?? null,
        endTime: exception.endTime ?? null,
        note: exception.note ?? null,
      })
      .returning();
    return exceptionToDomain(row);
  }

  async deleteException(id: string, professionalId: string): Promise<void> {
    await db
      .delete(availabilityExceptions)
      .where(and(eq(availabilityExceptions.id, id), eq(availabilityExceptions.professionalId, professionalId)));
  }
}
