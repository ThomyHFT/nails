import { describe, expect, it } from "vitest";
import { BRAND_ARCHETYPES } from "@/server/domain/branding/brand-archetypes";
import { resolveBrandTokens } from "@/server/domain/branding/resolve-brand-tokens";
import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";

function branding(overrides: Partial<TenantBranding> = {}): TenantBranding {
  return {
    id: "branding-1",
    professionalId: "prof-1",
    archetype: "minimal_nude",
    primaryColorHex: null,
    onPrimaryColorHex: null,
    fontPair: null,
    logoUrl: null,
    coverImageUrl: null,
    heroLayout: "split",
    sectionOrder: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("resolveBrandTokens", () => {
  it("returns minimal_nude untouched for a tenant without a branding row", () => {
    const resolved = resolveBrandTokens(null);

    expect(resolved.light).toEqual(BRAND_ARCHETYPES.minimal_nude.light);
    expect(resolved.dark).toEqual(BRAND_ARCHETYPES.minimal_nude.dark);
    expect(resolved.fontPair).toBe(BRAND_ARCHETYPES.minimal_nude.defaultFontPair);
    expect(resolved.logoUrl).toBeNull();
    expect(resolved.coverImageUrl).toBeNull();
  });

  it("overrides only primary in both variants when only primaryColorHex is set", () => {
    const resolved = resolveBrandTokens(branding({ archetype: "glam", primaryColorHex: "#123456" }));

    expect(resolved.light.primary).toBe("#123456");
    expect(resolved.dark.primary).toBe("#123456");
    expect(resolved.light.primaryForeground).toBe(BRAND_ARCHETYPES.glam.light.primaryForeground);
    expect(resolved.dark.primaryForeground).toBe(BRAND_ARCHETYPES.glam.dark.primaryForeground);
  });

  it("overrides primary and on-primary in both variants when both are set", () => {
    const resolved = resolveBrandTokens(
      branding({ archetype: "editorial", primaryColorHex: "#abcdef", onPrimaryColorHex: "#000000" }),
    );

    expect(resolved.light.primary).toBe("#abcdef");
    expect(resolved.light.primaryForeground).toBe("#000000");
    expect(resolved.dark.primary).toBe("#abcdef");
    expect(resolved.dark.primaryForeground).toBe("#000000");
  });

  it("falls back to the archetype's default font pair when font_pair is null", () => {
    const resolved = resolveBrandTokens(branding({ archetype: "pastel_soft", fontPair: null }));

    expect(resolved.fontPair).toBe(BRAND_ARCHETYPES.pastel_soft.defaultFontPair);
  });

  it("uses the chosen font pair when it is set", () => {
    const resolved = resolveBrandTokens(branding({ fontPair: "cormorant_inter" }));

    expect(resolved.fontPair).toBe("cormorant_inter");
  });

  it("passes through logo and cover URLs", () => {
    const resolved = resolveBrandTokens(
      branding({ logoUrl: "https://example.com/logo.png", coverImageUrl: "https://example.com/cover.png" }),
    );

    expect(resolved.logoUrl).toBe("https://example.com/logo.png");
    expect(resolved.coverImageUrl).toBe("https://example.com/cover.png");
  });
});
