import { BRAND_ARCHETYPES } from "@/server/domain/branding/brand-archetypes";
import type { BrandFontPair, BrandTokenSet } from "@/server/domain/branding/brand-tokens";
import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";

export type ResolvedBrand = {
  light: BrandTokenSet;
  dark: BrandTokenSet;
  fontPair: BrandFontPair;
  logoUrl: string | null;
  coverImageUrl: string | null;
};

function applyOverrides(tokens: BrandTokenSet, branding: TenantBranding): BrandTokenSet {
  return {
    ...tokens,
    primary: branding.primaryColorHex ?? tokens.primary,
    primaryForeground: branding.onPrimaryColorHex ?? tokens.primaryForeground,
  };
}

export function resolveBrandTokens(branding: TenantBranding | null): ResolvedBrand {
  const definition = BRAND_ARCHETYPES[branding?.archetype ?? "minimal_nude"];

  if (!branding) {
    return {
      light: definition.light,
      dark: definition.dark,
      fontPair: definition.defaultFontPair,
      logoUrl: null,
      coverImageUrl: null,
    };
  }

  return {
    light: applyOverrides(definition.light, branding),
    dark: applyOverrides(definition.dark, branding),
    fontPair: branding.fontPair ?? definition.defaultFontPair,
    logoUrl: branding.logoUrl,
    coverImageUrl: branding.coverImageUrl,
  };
}
