import type { AvailabilityRepository } from "@/server/domain/availability/availability-repository.port";
import type { AvailabilityRule } from "@/server/domain/availability/availability-rule.entity";

export interface RuleInput {
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface ConfigureAvailabilityRulesInput {
  professionalId: string;
  /** De quién es el horario (SPEC 22). */
  staffId: string;
  /** `null` guarda el horario semanal; un mes guarda una excepción de ese mes. */
  effectiveMonth: string | null;
  rules: RuleInput[];
}

export class ConfigureAvailabilityRulesUseCase {
  constructor(private readonly availabilityRepository: AvailabilityRepository) {}

  async execute(input: ConfigureAvailabilityRulesInput): Promise<AvailabilityRule[]> {
    await this.availabilityRepository.deleteRules(input.professionalId, input.staffId, input.effectiveMonth);

    const created: AvailabilityRule[] = [];
    for (const rule of input.rules) {
      created.push(
        await this.availabilityRepository.createRule({
          professionalId: input.professionalId,
          staffId: input.staffId,
          weekday: rule.weekday,
          startTime: rule.startTime,
          endTime: rule.endTime,
          effectiveMonth: input.effectiveMonth,
        }),
      );
    }

    return created;
  }
}
