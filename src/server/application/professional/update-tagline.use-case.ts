import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import type { Professional } from "@/server/domain/professional/professional.entity";

export class UpdateTaglineUseCase {
  constructor(private readonly professionalRepository: ProfessionalRepository) {}

  async execute(professionalId: string, tagline: string | null): Promise<Professional> {
    return this.professionalRepository.updateTagline(professionalId, tagline);
  }
}
