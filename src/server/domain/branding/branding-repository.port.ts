import type { BrandArchetype, BrandFontPair } from "@/server/domain/branding/brand-tokens";
import type { HeroLayout } from "@/server/domain/branding/portada-layout";
import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";

export interface BrandingUpsert {
  professionalId: string;
  archetype: BrandArchetype;
  primaryColorHex: string | null;
  onPrimaryColorHex: string | null;
  fontPair: BrandFontPair | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  heroLayout: HeroLayout;
  sectionOrder: unknown;
}

export interface BrandingRepository {
  findByProfessionalId(professionalId: string): Promise<TenantBranding | null>;
  upsert(branding: BrandingUpsert): Promise<TenantBranding>;
}
