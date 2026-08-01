import { FONT_PAIR_CSS_VARS } from "@/app/fonts";
import { BRAND_ARCHETYPES } from "@/server/domain/branding/brand-archetypes";
import type { BrandArchetype, BrandTokenSet } from "@/server/domain/branding/brand-tokens";

/**
 * Traduce un arquetipo a variables CSS inline para la página de referencia.
 *
 * Duplica a propósito la lógica de `[slug]/layout.tsx` en vez de importarla:
 * ese layout resuelve el branding real desde la base y sirve al microsite de
 * un tenant; esto es un banco de pruebas que cambia de arquetipo en el cliente
 * sin tocar datos.
 */
export function archetypeStyle(archetype: BrandArchetype, mode: "light" | "dark"): React.CSSProperties {
  const definition = BRAND_ARCHETYPES[archetype];
  const tokens: BrandTokenSet = definition[mode];
  const fonts = FONT_PAIR_CSS_VARS[definition.defaultFontPair];

  return {
    "--background": tokens.background,
    "--foreground": tokens.foreground,
    "--card": tokens.card,
    "--card-foreground": tokens.cardForeground,
    "--popover": tokens.popover,
    "--popover-foreground": tokens.popoverForeground,
    "--primary": tokens.primary,
    "--primary-foreground": tokens.primaryForeground,
    "--secondary": tokens.secondary,
    "--secondary-foreground": tokens.secondaryForeground,
    "--muted": tokens.muted,
    "--muted-foreground": tokens.mutedForeground,
    "--accent": tokens.accent,
    "--accent-foreground": tokens.accentForeground,
    "--destructive": tokens.destructive,
    "--border": tokens.border,
    "--input": tokens.input,
    "--ring": tokens.ring,
    "--radius": tokens.radius,
    "--tenant-font-heading": fonts.heading,
    "--tenant-font-body": fonts.body,
  } as React.CSSProperties;
}

export const ARCHETYPE_OPTIONS = (Object.keys(BRAND_ARCHETYPES) as BrandArchetype[]).map((value) => ({
  value,
  label: BRAND_ARCHETYPES[value].label,
}));
