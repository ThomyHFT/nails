import type { Professional } from "@/server/domain/professional/professional.entity";
import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import { ProfessionalNotFoundError } from "@/server/application/admin/toggle-professional-active.use-case";

/**
 * `days: null` quita el vencimiento (cuenta interna o ya pagada).
 * `days: number` extiende desde el mayor entre "ahora" y el vencimiento
 * actual, para que extender antes de que venza no pierda los días que ya
 * tenía otorgados.
 */
export class ExtendTrialUseCase {
  constructor(private readonly professionalRepository: ProfessionalRepository) {}

  async execute(professionalId: string, days: number | null, now: Date = new Date()): Promise<Professional> {
    const professional = await this.professionalRepository.findById(professionalId);
    if (!professional) {
      throw new ProfessionalNotFoundError();
    }

    if (days === null) {
      return this.professionalRepository.setTrialEndsAt(professionalId, null);
    }

    const currentEnd = professional.trialEndsAt ?? now;
    const base = currentEnd > now ? currentEnd : now;
    const trialEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    return this.professionalRepository.setTrialEndsAt(professionalId, trialEndsAt);
  }
}
