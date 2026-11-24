import type { AvailabilityException } from "@/server/domain/availability/availability-exception.entity";
import type { AvailabilityRule } from "@/server/domain/availability/availability-rule.entity";
import type {
  AvailabilityRepository,
  NewAvailabilityException,
  NewAvailabilityRule,
} from "@/server/domain/availability/availability-repository.port";

/** Integrante por defecto en los tests de un negocio de una sola persona (SPEC 22). */
export const DEFAULT_TEST_STAFF_ID = "staff-1";

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export class InMemoryAvailabilityRepository implements AvailabilityRepository {
  private readonly rules: AvailabilityRule[] = [];
  private readonly exceptions: AvailabilityException[] = [];
  private nextId = 1;

  async listRules(staffId: string, effectiveMonth: string | null): Promise<AvailabilityRule[]> {
    return this.rules.filter((rule) => rule.staffId === staffId && rule.effectiveMonth === effectiveMonth);
  }

  // `staffId` opcional solo en el fake: los tests de una sola integrante no lo repiten.
  async createRule(rule: Optional<NewAvailabilityRule, "staffId">): Promise<AvailabilityRule> {
    const created: AvailabilityRule = { id: String(this.nextId++), active: true, staffId: DEFAULT_TEST_STAFF_ID, ...rule };
    this.rules.push(created);
    return created;
  }

  async deleteRule(id: string, professionalId: string): Promise<void> {
    const index = this.rules.findIndex((rule) => rule.id === id && rule.professionalId === professionalId);
    if (index >= 0) this.rules.splice(index, 1);
  }

  async deleteRules(professionalId: string, staffId: string, effectiveMonth: string | null): Promise<void> {
    for (let i = this.rules.length - 1; i >= 0; i--) {
      const rule = this.rules[i];
      if (rule.professionalId === professionalId && rule.staffId === staffId && rule.effectiveMonth === effectiveMonth) {
        this.rules.splice(i, 1);
      }
    }
  }

  async listExceptionsByDate(staffId: string, date: string): Promise<AvailabilityException[]> {
    return this.exceptions.filter((exception) => exception.staffId === staffId && exception.date === date);
  }

  async listExceptionsInMonth(staffId: string, effectiveMonth: string): Promise<AvailabilityException[]> {
    return this.exceptions.filter(
      (exception) => exception.staffId === staffId && exception.date.startsWith(effectiveMonth.slice(0, 7)),
    );
  }

  async createException(exception: Optional<NewAvailabilityException, "staffId">): Promise<AvailabilityException> {
    const created: AvailabilityException = {
      id: String(this.nextId++),
      professionalId: exception.professionalId,
      staffId: exception.staffId ?? DEFAULT_TEST_STAFF_ID,
      date: exception.date,
      kind: exception.kind,
      startTime: exception.startTime ?? null,
      endTime: exception.endTime ?? null,
      note: exception.note ?? null,
    };
    this.exceptions.push(created);
    return created;
  }

  async deleteException(id: string, professionalId: string): Promise<void> {
    const index = this.exceptions.findIndex((exc) => exc.id === id && exc.professionalId === professionalId);
    if (index >= 0) this.exceptions.splice(index, 1);
  }
}
