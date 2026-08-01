import type { BlobStorage } from "@/server/domain/portfolio/blob-storage.port";
import type { PortfolioItem } from "@/server/domain/portfolio/portfolio-item.entity";
import type {
  NewPortfolioItem,
  PortfolioItemPatch,
  PortfolioRepository,
} from "@/server/domain/portfolio/portfolio-repository.port";
import type { ServicesRepository } from "@/server/domain/service/services-repository.port";

export class InvalidImageUrlError extends Error {
  constructor() {
    super("image_url debe empezar con https://");
    this.name = "InvalidImageUrlError";
  }
}

export class ServiceNotOwnedError extends Error {
  constructor() {
    super("El servicio asociado no pertenece a este tenant");
    this.name = "ServiceNotOwnedError";
  }
}

export class PortfolioItemNotFoundError extends Error {
  constructor() {
    super("El ítem de portafolio no existe");
    this.name = "PortfolioItemNotFoundError";
  }
}

function assertHttpsUrl(value: string): void {
  if (!value.startsWith("https://")) {
    throw new InvalidImageUrlError();
  }
}

export class ConfigurePortfolioUseCase {
  constructor(
    private readonly portfolioRepository: PortfolioRepository,
    private readonly servicesRepository: ServicesRepository,
    private readonly blobStorage: BlobStorage,
  ) {}

  async create(input: NewPortfolioItem): Promise<PortfolioItem> {
    assertHttpsUrl(input.imageUrl);
    if (input.serviceId) {
      const service = await this.servicesRepository.findById(input.serviceId, input.professionalId);
      if (!service) {
        throw new ServiceNotOwnedError();
      }
    }
    return this.portfolioRepository.create(input);
  }

  async update(id: string, professionalId: string, patch: PortfolioItemPatch): Promise<PortfolioItem> {
    const existing = await this.portfolioRepository.findById(id, professionalId);
    if (!existing) {
      throw new PortfolioItemNotFoundError();
    }
    if (patch.serviceId) {
      const service = await this.servicesRepository.findById(patch.serviceId, professionalId);
      if (!service) {
        throw new ServiceNotOwnedError();
      }
    }
    return this.portfolioRepository.update(id, professionalId, patch);
  }

  async delete(id: string, professionalId: string): Promise<void> {
    const existing = await this.portfolioRepository.findById(id, professionalId);
    if (!existing) {
      throw new PortfolioItemNotFoundError();
    }
    await this.portfolioRepository.delete(id, professionalId);
    await this.blobStorage.delete(existing.imageUrl);
  }
}
