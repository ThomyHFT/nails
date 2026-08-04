import type { BrandFontPair } from "@/server/domain/branding/brand-tokens";

// Mapea cada par a las variables CSS declaradas en layout.tsx. Vive en `app/`
// porque las variables son un detalle de `next/font`, no del dominio.
export const FONT_PAIR_CSS_VARS: Record<BrandFontPair, { heading: string; body: string }> = {
  playfair_jakarta: { heading: "var(--font-playfair-display)", body: "var(--font-plus-jakarta-sans)" },
  cormorant_inter: { heading: "var(--font-cormorant-garamond)", body: "var(--font-inter)" },
  dmserif_outfit: { heading: "var(--font-dm-serif-display)", body: "var(--font-outfit)" },
  jakarta_solo: { heading: "var(--font-plus-jakarta-sans)", body: "var(--font-plus-jakarta-sans)" },
  fraunces_nunito: { heading: "var(--font-fraunces)", body: "var(--font-nunito)" },
  oswald_inter: { heading: "var(--font-oswald)", body: "var(--font-inter)" },
  outfit_solo: { heading: "var(--font-outfit)", body: "var(--font-outfit)" },
};
