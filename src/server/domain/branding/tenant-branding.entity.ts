import type { BrandArchetype, BrandFontPair } from "@/server/domain/branding/brand-tokens";

export interface TenantBranding {
  id: string;
  professionalId: string;
  archetype: BrandArchetype;
  primaryColorHex: string | null;
  onPrimaryColorHex: string | null;
  fontPair: BrandFontPair | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
