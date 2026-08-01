import { notFound } from "next/navigation";
import { FONT_PAIR_CSS_VARS } from "@/app/fonts";
import { GetTenantBrandingUseCase } from "@/server/application/branding/get-tenant-branding.use-case";
import { GetProfessionalBySlugUseCase } from "@/server/application/tenant/get-professional-by-slug.use-case";
import type { BrandTokenSet } from "@/server/domain/branding/brand-tokens";
import { resolveBrandTokens } from "@/server/domain/branding/resolve-brand-tokens";
import { DrizzleBrandingRepository } from "@/server/infrastructure/repositories/drizzle-branding.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

function tokensToCssDeclarations(tokens: BrandTokenSet): string {
  return `--background:${tokens.background};--foreground:${tokens.foreground};--card:${tokens.card};--card-foreground:${tokens.cardForeground};--popover:${tokens.popover};--popover-foreground:${tokens.popoverForeground};--primary:${tokens.primary};--primary-foreground:${tokens.primaryForeground};--secondary:${tokens.secondary};--secondary-foreground:${tokens.secondaryForeground};--muted:${tokens.muted};--muted-foreground:${tokens.mutedForeground};--accent:${tokens.accent};--accent-foreground:${tokens.accentForeground};--destructive:${tokens.destructive};--border:${tokens.border};--input:${tokens.input};--ring:${tokens.ring};--radius:${tokens.radius};`;
}

function tokensToStyle(tokens: BrandTokenSet): React.CSSProperties {
  return {
    background: tokens.background,
    color: tokens.foreground,
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
  } as React.CSSProperties;
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const professional = await new GetProfessionalBySlugUseCase(new DrizzleProfessionalRepository()).execute(slug);
  if (!professional) {
    notFound();
  }

  const branding = await new GetTenantBrandingUseCase(new DrizzleBrandingRepository()).execute(professional.id);
  const resolved = resolveBrandTokens(branding);
  const fontVars = FONT_PAIR_CSS_VARS[resolved.fontPair];

  const scopeAttr = `data-tenant="${slug}"`;
  const darkOverride = `@media (prefers-color-scheme: dark) { [${scopeAttr}] { ${tokensToCssDeclarations(resolved.dark)} } }`;

  return (
    <div
      data-tenant={slug}
      className="tenant-brand flex min-h-screen flex-col bg-background text-foreground"
      style={{
        ...tokensToStyle(resolved.light),
        "--tenant-font-heading": fontVars.heading,
        "--tenant-font-body": fontVars.body,
      } as React.CSSProperties}
    >
      <style dangerouslySetInnerHTML={{ __html: darkOverride }} />
      {children}
    </div>
  );
}
