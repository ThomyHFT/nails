import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { FONT_PAIR_CSS_VARS } from "@/app/fonts";
import { GetTenantBrandingUseCase } from "@/server/application/branding/get-tenant-branding.use-case";
import type { BrandTokenSet } from "@/server/domain/branding/brand-tokens";
import { resolveBrandTokens } from "@/server/domain/branding/resolve-brand-tokens";
import { DrizzleBrandingRepository } from "@/server/infrastructure/repositories/drizzle-branding.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

function tokensToCssDeclarations(tokens: BrandTokenSet): string {
  return `--background:${tokens.background};--foreground:${tokens.foreground};--card:${tokens.card};--card-foreground:${tokens.cardForeground};--popover:${tokens.popover};--popover-foreground:${tokens.popoverForeground};--primary:${tokens.primary};--primary-foreground:${tokens.primaryForeground};--secondary:${tokens.secondary};--secondary-foreground:${tokens.secondaryForeground};--muted:${tokens.muted};--muted-foreground:${tokens.mutedForeground};--accent:${tokens.accent};--accent-foreground:${tokens.accentForeground};--destructive:${tokens.destructive};--border:${tokens.border};--input:${tokens.input};--ring:${tokens.ring};--radius:${tokens.radius};`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  if (!professional) {
    notFound();
  }

  const branding = await new GetTenantBrandingUseCase(new DrizzleBrandingRepository()).execute(professional.id);

  const description = professional.bio ?? undefined;

  return {
    title: professional.businessName,
    description,
    openGraph: {
      title: professional.businessName,
      description,
      images: branding?.coverImageUrl ? [{ url: branding.coverImageUrl }] : undefined,
    },
  };
}

// La barra de estado del navegador en móvil, sin esto, corta el crema del
// tenant con el gris/blanco por defecto de Chrome apenas se hace scroll.
export async function generateViewport({ params }: { params: Promise<{ slug: string }> }): Promise<Viewport> {
  const { slug } = await params;

  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  if (!professional) {
    return {};
  }

  const branding = await new GetTenantBrandingUseCase(new DrizzleBrandingRepository()).execute(professional.id);
  const resolved = resolveBrandTokens(branding);

  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: resolved.light.background },
      { media: "(prefers-color-scheme: dark)", color: resolved.dark.background },
    ],
  };
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Existencia, no visibilidad pública: este layout envuelve tanto (public)
  // como admin. Un tenant recién registrado tiene publishedAt: null, y la
  // profesional tiene que poder entrar a su panel igual — GetProfessionalBySlugUseCase
  // (que sí filtra por publicación) ya se usa dentro de (public)/layout.tsx,
  // que es el único lugar donde ese 404 corresponde.
  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  if (!professional) {
    notFound();
  }

  const branding = await new GetTenantBrandingUseCase(new DrizzleBrandingRepository()).execute(professional.id);
  const resolved = resolveBrandTokens(branding);
  const fontVars = FONT_PAIR_CSS_VARS[resolved.fontPair];

  const selector = `[data-tenant="${slug}"]`;
  // Ambas variantes viven en el <style>, no en el atributo `style` del div: una
  // variable inline en el mismo elemento gana siempre sobre cualquier regla
  // externa, aunque esté dentro de un @media que sí matchea, así que el
  // override oscuro nunca podría pisar un valor claro puesto inline.
  //
  // El selector incluye `:root` además de `[data-tenant]`: las custom
  // properties no suben de un hijo a su padre, así que sin esto `--background`
  // del tenant solo pintaba el div y el `<body>` se quedaba blanco. No se
  // notaba en el scroll normal, pero el rebote elástico de iOS (o cualquier
  // altura de contenido menor a 100vh) dejaba ver esa costura blanca detrás
  // del crema del tenant.
  const themeCss = [
    `${selector}, :root{${tokensToCssDeclarations(resolved.light)}--tenant-font-heading:${fontVars.heading};--tenant-font-body:${fontVars.body};}`,
    `@media (prefers-color-scheme: dark){${selector}, :root{${tokensToCssDeclarations(resolved.dark)}}}`,
  ].join("");

  return (
    <div data-tenant={slug} className="tenant-brand flex min-h-screen flex-col bg-background text-foreground">
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      {children}
    </div>
  );
}
