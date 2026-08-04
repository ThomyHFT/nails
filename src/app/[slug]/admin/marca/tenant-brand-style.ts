import { FONT_PAIR_CSS_VARS } from "@/app/fonts";
import type { BrandFontPair, BrandTokenSet } from "@/server/domain/branding/brand-tokens";

/**
 * Variables CSS de un `BrandTokenSet` para aplicar sobre un elemento con la
 * clase `.tenant-brand` — la escalera tonal (`--surface-*`) se deriva de estas
 * en el mismo elemento, así que no basta con pintar `--primary` suelto.
 */
export function tenantBrandStyle(tokens: BrandTokenSet, fontPair: BrandFontPair): React.CSSProperties {
  const fontVars = FONT_PAIR_CSS_VARS[fontPair];
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
    "--tenant-font-heading": fontVars.heading,
    "--tenant-font-body": fontVars.body,
  } as React.CSSProperties;
}
