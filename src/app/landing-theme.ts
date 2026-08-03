import type { CSSProperties } from "react";
import { FONT_PAIR_CSS_VARS } from "@/app/fonts";
import { BRAND_ARCHETYPES } from "@/server/domain/branding/brand-archetypes";
import type { BrandArchetype, BrandTokenSet } from "@/server/domain/branding/brand-tokens";

/**
 * Theming en vivo de la portada.
 *
 * La portada no *describe* que cada tenant tiene su propia marca: lo demuestra
 * re-tematizándose entera mientras el visitante juega. Por eso resuelve los
 * mismos tokens que `[slug]/layout.tsx` pero desde el estado del cliente, sin
 * tocar la base — es el mismo truco de `estilo/tokens.ts`, con el añadido del
 * primary personalizado, que es la única palanca que el SPEC 04 deja override.
 */

export type ThemeMode = "light" | "dark";

/**
 * Colores de arranque del conmutador. Son puntos de partida reconocibles del
 * oficio (nude, rosa glam, lila, jade, terracota, noche, tinta), no una paleta
 * cerrada: al lado va un `input[type=color]` para elegir cualquier otro.
 */
export const PLAYGROUND_COLORS = [
  { hex: "#72564c", label: "Nude" },
  { hex: "#d81b60", label: "Rosa" },
  { hex: "#9a59aa", label: "Lila" },
  { hex: "#0f766e", label: "Jade" },
  { hex: "#c2410c", label: "Terracota" },
  { hex: "#1e3a8a", label: "Noche" },
  { hex: "#111111", label: "Tinta" },
];

/**
 * Blanco o casi-negro sobre un color arbitrario.
 *
 * Cuando el visitante elige su propio primary hay que decidir el color del
 * texto encima o el CTA queda ilegible. Misma fórmula perceptual que usa el
 * check de `Swatch`, para que la portada y el diseñador no discrepen.
 */
export function readableOn(hex: string): string {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(value)) return "#ffffff";

  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1a1a1a" : "#ffffff";
}

/** Tokens ya resueltos, para las piezas que necesitan el color crudo (degradés del preview). */
export function landingPalette(
  archetype: BrandArchetype,
  mode: ThemeMode,
  primary: string | null,
): BrandTokenSet {
  const tokens = BRAND_ARCHETYPES[archetype][mode];
  if (!primary) return tokens;

  return { ...tokens, primary, primaryForeground: readableOn(primary) };
}

export function landingBrandStyle(
  archetype: BrandArchetype,
  mode: ThemeMode,
  primary: string | null,
): CSSProperties {
  const tokens = landingPalette(archetype, mode, primary);
  const fonts = FONT_PAIR_CSS_VARS[BRAND_ARCHETYPES[archetype].defaultFontPair];

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
  } as CSSProperties;
}

export const ARCHETYPE_CHOICES = (Object.keys(BRAND_ARCHETYPES) as BrandArchetype[]).map((value) => ({
  value,
  label: BRAND_ARCHETYPES[value].label,
  /** Muestra de tres colores para la tarjeta de arquetipo del conmutador. */
  swatches: [
    BRAND_ARCHETYPES[value].light.primary,
    BRAND_ARCHETYPES[value].light.accent,
    BRAND_ARCHETYPES[value].light.card,
  ],
}));
