import { notFound } from "next/navigation";
import { GetProfessionalBySlugUseCase } from "@/server/application/tenant/get-professional-by-slug.use-case";
import { GetTenantBrandingUseCase } from "@/server/application/branding/get-tenant-branding.use-case";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleBrandingRepository } from "@/server/infrastructure/repositories/drizzle-branding.repository";
import { TenantHeader } from "@/app/[slug]/(public)/TenantHeader";
import { BottomNav } from "@/app/[slug]/(public)/BottomNav";
import { SiteFooter } from "@/components/brand";
import { instagramUrl } from "@/app/[slug]/(public)/links";

export default async function PublicLayout({
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

  return (
    <div className="flex min-h-screen flex-col">
      <TenantHeader slug={slug} businessName={professional.businessName} logoUrl={branding?.logoUrl ?? null} />
      {/* `flex flex-col` y no solo `flex-1`: AuthCard depende de heredar un
          padre flex para que su propio `flex-1 justify-center` centre el
          formulario. Sin esto, login/registro/recuperar quedaban pegados
          arriba con el pie 400px más abajo. */}
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter
        businessName={professional.businessName}
        tagline={professional.tagline}
        links={[
          { label: "Servicios", href: `/${slug}/servicios` },
          { label: "Opiniones", href: `/${slug}/opiniones` },
          ...(professional.instagramHandle
            ? [{ label: "Instagram", href: instagramUrl(professional.instagramHandle), external: true }]
            : []),
        ]}
      />
      <BottomNav slug={slug} />
    </div>
  );
}
