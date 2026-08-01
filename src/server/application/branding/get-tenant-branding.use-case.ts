import type { BrandingRepository } from "@/server/domain/branding/branding-repository.port";
import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";

export class GetTenantBrandingUseCase {
  constructor(private readonly brandingRepository: BrandingRepository) {}

  async execute(professionalId: string): Promise<TenantBranding | null> {
    return this.brandingRepository.findByProfessionalId(professionalId);
  }
}
