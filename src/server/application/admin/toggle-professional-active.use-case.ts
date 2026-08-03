import type { Professional } from "@/server/domain/professional/professional.entity";
import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";

export class ProfessionalNotFoundError extends Error {
  constructor() {
    super("Profesional no encontrada");
    this.name = "ProfessionalNotFoundError";
  }
}

export class ToggleProfessionalActiveUseCase {
  constructor(private readonly professionalRepository: ProfessionalRepository) {}

  async execute(professionalId: string, active: boolean): Promise<Professional> {
    const professional = await this.professionalRepository.findById(professionalId);
    if (!professional) {
      throw new ProfessionalNotFoundError();
    }

    return this.professionalRepository.setActive(professionalId, active);
  }
}
