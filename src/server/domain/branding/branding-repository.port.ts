import type { BrandArchetype, BrandFontPair } from "@/server/domain/branding/brand-tokens";
import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";

export interface BrandingUpsert {
  professionalId: string;
  archetype: BrandArchetype;
  primaryColorHex: string | null;
  onPrimaryColorHex: string | null;
  fontPair: BrandFontPair | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
}

export interface BrandingRepository {
  findByProfessionalId(professionalId: string): Promise<TenantBranding | null>;
  upsert(branding: BrandingUpsert): Promise<TenantBranding>;
}
