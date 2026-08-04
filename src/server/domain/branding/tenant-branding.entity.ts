import type { BrandArchetype, BrandFontPair } from "@/server/domain/branding/brand-tokens";
import type { HeroLayout } from "@/server/domain/branding/portada-layout";

export interface TenantBranding {
  id: string;
  professionalId: string;
  archetype: BrandArchetype;
  primaryColorHex: string | null;
  onPrimaryColorHex: string | null;
  fontPair: BrandFontPair | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  heroLayout: HeroLayout;
  sectionOrder: unknown;
  createdAt: Date;
  updatedAt: Date;
}
