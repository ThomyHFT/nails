import type { Professional } from "@/server/domain/professional/professional.entity";
import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";

export class ListProfessionalsUseCase {
  constructor(private readonly professionalRepository: ProfessionalRepository) {}

  async execute(): Promise<Professional[]> {
    return this.professionalRepository.findAll();
  }
}
