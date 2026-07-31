import type { AvailabilityException } from "@/server/domain/availability/availability-exception.entity";
import type { AvailabilityRule } from "@/server/domain/availability/availability-rule.entity";
import type {
  AvailabilityRepository,
  NewAvailabilityException,
  NewAvailabilityRule,
} from "@/server/domain/availability/availability-repository.port";

export class InMemoryAvailabilityRepository implements AvailabilityRepository {
  private readonly rules: AvailabilityRule[] = [];
  private readonly exceptions: AvailabilityException[] = [];
  private nextId = 1;

  async listRulesByProfessionalAndMonth(professionalId: string, effectiveMonth: string): Promise<AvailabilityRule[]> {
    return this.rules.filter(
      (rule) => rule.professionalId === professionalId && rule.effectiveMonth === effectiveMonth,
    );
  }

  async createRule(rule: NewAvailabilityRule): Promise<AvailabilityRule> {
    const created: AvailabilityRule = { id: String(this.nextId++), active: true, ...rule };
    this.rules.push(created);
    return created;
  }

  async deleteRule(id: string, professionalId: string): Promise<void> {
    const index = this.rules.findIndex((rule) => rule.id === id && rule.professionalId === professionalId);
    if (index >= 0) this.rules.splice(index, 1);
  }

  async deleteRulesByProfessionalAndMonth(professionalId: string, effectiveMonth: string): Promise<void> {
    for (let i = this.rules.length - 1; i >= 0; i--) {
      if (this.rules[i].professionalId === professionalId && this.rules[i].effectiveMonth === effectiveMonth) {
        this.rules.splice(i, 1);
      }
    }
  }

  async listExceptionsByProfessionalAndDate(professionalId: string, date: string): Promise<AvailabilityException[]> {
    return this.exceptions.filter((exception) => exception.professionalId === professionalId && exception.date === date);
  }

  async listExceptionsByProfessionalInMonth(
    professionalId: string,
    effectiveMonth: string,
  ): Promise<AvailabilityException[]> {
    return this.exceptions.filter(
      (exception) => exception.professionalId === professionalId && exception.date.startsWith(effectiveMonth.slice(0, 7)),
    );
  }

  async createException(exception: NewAvailabilityException): Promise<AvailabilityException> {
    const created: AvailabilityException = {
      id: String(this.nextId++),
      professionalId: exception.professionalId,
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
