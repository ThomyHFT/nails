import type { ContactInfoInput, ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import type { Professional } from "@/server/domain/professional/professional.entity";

export class UpdateContactInfoUseCase {
  constructor(private readonly professionalRepository: ProfessionalRepository) {}

  async execute(professionalId: string, input: ContactInfoInput): Promise<Professional> {
    return this.professionalRepository.updateContactInfo(professionalId, input);
  }
}
