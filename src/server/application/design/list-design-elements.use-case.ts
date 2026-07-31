import type { DesignElement } from "@/server/domain/design/design-element.entity";
import type { DesignRepository } from "@/server/domain/design/design-repository.port";

export class ListDesignElementsUseCase {
  constructor(private readonly designRepository: DesignRepository) {}

  async execute(professionalId: string, opts?: { onlyActive?: boolean }): Promise<DesignElement[]> {
    return this.designRepository.listElementsByProfessional(professionalId, opts);
  }
}
