import { FONT_PAIR_CSS_VARS } from "@/app/fonts";
import type { BrandFontPair, BrandTokenSet } from "@/server/domain/branding/brand-tokens";

function tokensStyle(tokens: BrandTokenSet, fontPair: BrandFontPair): React.CSSProperties {
  const fontVars = FONT_PAIR_CSS_VARS[fontPair];
  return {
    "--background": tokens.background,
    "--foreground": tokens.foreground,
    "--card": tokens.card,
    "--card-foreground": tokens.cardForeground,
    "--primary": tokens.primary,
    "--primary-foreground": tokens.primaryForeground,
    "--secondary": tokens.secondary,
    "--secondary-foreground": tokens.secondaryForeground,
    "--muted": tokens.muted,
    "--muted-foreground": tokens.mutedForeground,
    "--accent": tokens.accent,
    "--accent-foreground": tokens.accentForeground,
    "--border": tokens.border,
    "--input": tokens.input,
    "--ring": tokens.ring,
    "--radius": tokens.radius,
    "--tenant-font-heading": fontVars.heading,
    "--tenant-font-body": fontVars.body,
  } as React.CSSProperties;
}

export function BrandPreview({
  label,
  tokens,
  fontPair,
}: {
  label: string;
  tokens: BrandTokenSet;
  fontPair: BrandFontPair;
}) {
  return (
    <div className="flex-1 overflow-hidden rounded-lg border border-border">
      <p className="border-b border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <div
        className="tenant-brand flex flex-col gap-3 bg-background p-4 text-foreground"
        style={{ ...tokensStyle(tokens, fontPair), fontFamily: "var(--tenant-font-body)" }}
      >
        <p
          className="text-lg font-semibold"
          style={{ fontFamily: "var(--tenant-font-heading)", color: "var(--foreground)" }}
        >
          Uñas por ti
        </p>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Reserva tu hora y diseña tus uñas.
        </p>
        <button
          type="button"
          className="w-fit px-4 py-1.5 text-sm font-medium"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            borderRadius: "var(--radius)",
          }}
        >
          Reservar hora
        </button>
        <input
          disabled
          placeholder="Tu nombre"
          className="text-sm"
          style={{
            background: "var(--background)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "0.375rem 0.625rem",
          }}
        />
        <div
          className="p-3 text-sm"
          style={{
            background: "var(--card)",
            color: "var(--card-foreground)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          Manicure semipermanente — $18.000
        </div>
      </div>
    </div>
  );
}
