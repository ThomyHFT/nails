import type { PortfolioItem } from "@/server/domain/portfolio/portfolio-item.entity";
import type { PortfolioRepository } from "@/server/domain/portfolio/portfolio-repository.port";

export class ListPortfolioUseCase {
  constructor(private readonly portfolioRepository: PortfolioRepository) {}

  async execute(professionalId: string, opts?: { onlyPublished?: boolean }): Promise<PortfolioItem[]> {
    if (opts?.onlyPublished) {
      return this.portfolioRepository.listPublished(professionalId);
    }
    return this.portfolioRepository.listByProfessional(professionalId);
  }
}
