import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import type { Professional } from "@/server/domain/professional/professional.entity";

export class GetProfessionalBySlugUseCase {
  constructor(private readonly professionalRepository: ProfessionalRepository) {}

  async execute(slug: string): Promise<Professional | null> {
    const professional = await this.professionalRepository.findBySlug(slug);

    if (!professional || !professional.active) {
      return null;
    }

    return professional;
  }
}
