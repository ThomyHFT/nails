import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import type { Professional } from "@/server/domain/professional/professional.entity";

export class UpdateBufferMinutesUseCase {
  constructor(private readonly professionalRepository: ProfessionalRepository) {}

  async execute(professionalId: string, bufferMinutes: number): Promise<Professional> {
    return this.professionalRepository.updateBufferMinutes(professionalId, bufferMinutes);
  }
}
