import type { ServiceWithVariants } from "@/server/domain/service/service.entity";
import type { ServicesRepository } from "@/server/domain/service/services-repository.port";

export class ListServicesUseCase {
  constructor(private readonly servicesRepository: ServicesRepository) {}

  async execute(professionalId: string): Promise<ServiceWithVariants[]> {
    return this.servicesRepository.listByProfessional(professionalId);
  }
}
