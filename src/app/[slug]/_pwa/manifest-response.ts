import { GetTenantBrandingUseCase } from "@/server/application/branding/get-tenant-branding.use-case";
import { GetProfessionalBySlugUseCase } from "@/server/application/tenant/get-professional-by-slug.use-case";
import { resolveBrandTokens } from "@/server/domain/branding/resolve-brand-tokens";
import { buildWebManifest, type ManifestKind } from "@/server/domain/tenant/web-manifest";
import { DrizzleBrandingRepository } from "@/server/infrastructure/repositories/drizzle-branding.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

/** Datos públicos del negocio para el manifiesto y los íconos (SPEC 20). */
export async function loadTenantForPwa(slug: string) {
  const professional = await new GetProfessionalBySlugUseCase(new DrizzleProfessionalRepository()).execute(slug);
  if (!professional) return null;
  const branding = await new GetTenantBrandingUseCase(new DrizzleBrandingRepository()).execute(professional.id);
  return { professional, brand: resolveBrandTokens(branding) };
}

export async function manifestResponse(slug: string, kind: ManifestKind): Promise<Response> {
  const tenant = await loadTenantForPwa(slug);
  if (!tenant) return new Response("No encontrado", { status: 404 });
  const manifest = buildWebManifest({
    kind,
    slug: tenant.professional.slug,
    businessName: tenant.professional.businessName,
    description: tenant.professional.tagline ?? tenant.professional.bio,
    themeColor: tenant.brand.light.primary,
    backgroundColor: tenant.brand.light.background,
  });
  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
