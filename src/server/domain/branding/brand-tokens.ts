export type BrandArchetype = "minimal_nude" | "glam" | "editorial" | "pastel_soft";

export type BrandFontPair =
  | "playfair_jakarta"
  | "cormorant_inter"
  | "dmserif_outfit"
  | "jakarta_solo"
  | "fraunces_nunito";

export type BrandTokenSet = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  radius: string;
};

export type BrandArchetypeDefinition = {
  label: string;
  defaultFontPair: BrandFontPair;
  light: BrandTokenSet;
  dark: BrandTokenSet;
};

export const FONT_PAIR_FAMILIES: Record<BrandFontPair, { heading: string; body: string }> = {
  playfair_jakarta: { heading: "Playfair Display", body: "Plus Jakarta Sans" },
  cormorant_inter: { heading: "Cormorant Garamond", body: "Inter" },
  dmserif_outfit: { heading: "DM Serif Display", body: "Outfit" },
  jakarta_solo: { heading: "Plus Jakarta Sans", body: "Plus Jakarta Sans" },
  fraunces_nunito: { heading: "Fraunces", body: "Nunito" },
};
