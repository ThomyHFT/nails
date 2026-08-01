import { describe, expect, it } from "vitest";
import { BRAND_ARCHETYPES } from "@/server/domain/branding/brand-archetypes";
import type { BrandTokenSet } from "@/server/domain/branding/brand-tokens";

const TOKEN_KEYS: (keyof BrandTokenSet)[] = [
  "background",
  "foreground",
  "card",
  "cardForeground",
  "popover",
  "popoverForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "muted",
  "mutedForeground",
  "accent",
  "accentForeground",
  "destructive",
  "border",
  "input",
  "ring",
  "radius",
];

describe("BRAND_ARCHETYPES", () => {
  it("defines the four archetypes", () => {
    expect(Object.keys(BRAND_ARCHETYPES).sort()).toEqual(
      ["editorial", "glam", "minimal_nude", "pastel_soft"].sort(),
    );
  });

  for (const [archetype, definition] of Object.entries(BRAND_ARCHETYPES)) {
    for (const variant of ["light", "dark"] as const) {
      it(`has every token filled for ${archetype} (${variant})`, () => {
        const tokens = definition[variant];
        for (const key of TOKEN_KEYS) {
          expect(tokens[key], `${archetype}.${variant}.${key}`).toBeTruthy();
        }
      });
    }

    it(`declares a default font pair for ${archetype}`, () => {
      expect(definition.defaultFontPair).toBeTruthy();
    });
  }
});
