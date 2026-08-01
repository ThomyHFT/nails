import { notFound } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { GetProfessionalBySlugUseCase } from "@/server/application/tenant/get-professional-by-slug.use-case";
import { GetTenantBrandingUseCase } from "@/server/application/branding/get-tenant-branding.use-case";
import { ListPortfolioUseCase } from "@/server/application/portfolio/list-portfolio.use-case";
import { ListServicesUseCase } from "@/server/application/service/list-services.use-case";
import { priceFromClp } from "@/server/domain/service/price-from";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleBrandingRepository } from "@/server/infrastructure/repositories/drizzle-branding.repository";
import { DrizzlePortfolioRepository } from "@/server/infrastructure/repositories/drizzle-portfolio.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import { SafeImage } from "@/app/[slug]/(public)/SafeImage";

const FEATURED_SERVICES_LIMIT = 4;
const PORTFOLIO_PREVIEW_LIMIT = 6;

function normalizePhoneForWhatsApp(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

function instagramUrl(handle: string): string {
  const clean = handle.startsWith("@") ? handle.slice(1) : handle;
  return `https://instagram.com/${clean}`;
}

export default async function TenantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const professional = await new GetProfessionalBySlugUseCase(new DrizzleProfessionalRepository()).execute(slug);
  if (!professional) {
    notFound();
  }

  const branding = await new GetTenantBrandingUseCase(new DrizzleBrandingRepository()).execute(professional.id);

  const allServices = await new ListServicesUseCase(new DrizzleServicesRepository()).execute(professional.id);
  const featuredServices = allServices
    .filter((s) => s.active)
    .map((s) => ({ id: s.id, name: s.name, priceFrom: priceFromClp(s.variants) }))
    .filter((s): s is { id: string; name: string; priceFrom: number } => s.priceFrom !== null)
    .slice(0, FEATURED_SERVICES_LIMIT);

  const portfolioItems = (
    await new ListPortfolioUseCase(new DrizzlePortfolioRepository()).execute(professional.id, {
      onlyPublished: true,
    })
  ).slice(0, PORTFOLIO_PREVIEW_LIMIT);

  return (
    <div className="flex flex-col">
      <section
        className="relative flex flex-col items-center gap-4 overflow-hidden px-4 py-16 text-center"
        style={
          branding?.coverImageUrl
            ? {
                backgroundImage: `linear-gradient(color-mix(in oklch, var(--background) 55%, transparent), var(--background)), url(${branding.coverImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {branding?.logoUrl && (
          <SafeImage
            src={branding.logoUrl}
            alt={professional.businessName}
            className="size-16 rounded-full object-cover"
            style={{ border: "2px solid var(--border)" }}
          />
        )}
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--tenant-font-heading)" }}>
          {professional.businessName}
        </h1>
        {professional.bio && <p className="max-w-md text-muted-foreground">{professional.bio}</p>}
        <Link
          href={`/${slug}/reservar`}
          className="mt-2 px-6 py-2.5 text-sm font-semibold"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)", borderRadius: "var(--radius)" }}
        >
          Reservar hora
        </Link>
      </section>

      {featuredServices.length > 0 && (
        <section className="flex flex-col gap-3 px-4 py-8">
          <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--tenant-font-heading)" }}>
            Servicios destacados
          </h2>
          <ul className="flex flex-col gap-2">
            {featuredServices.map((service) => (
              <li
                key={service.id}
                className="flex items-center justify-between gap-3 p-3 text-sm"
                style={{
                  background: "var(--card)",
                  color: "var(--card-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                }}
              >
                <span>{service.name}</span>
                <span style={{ color: "var(--muted-foreground)" }}>
                  Desde ${service.priceFrom.toLocaleString("es-CL")}
                </span>
              </li>
            ))}
          </ul>
          <Link href={`/${slug}/servicios`} className="w-fit text-sm font-medium" style={{ color: "var(--primary)" }}>
            Ver catálogo completo →
          </Link>
        </section>
      )}

      {portfolioItems.length > 0 && (
        <section className="flex flex-col gap-3 px-4 py-8">
          <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--tenant-font-heading)" }}>
            Portafolio
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {portfolioItems.map((item) => (
              <SafeImage key={item.id} src={item.imageUrl} alt="" className="aspect-square rounded-md object-cover" />
            ))}
          </div>
        </section>
      )}

      {(professional.phone || professional.instagramHandle) && (
        <section className="flex flex-col items-center gap-3 px-4 py-8">
          {professional.phone && (
            <a
              href={`https://wa.me/${normalizePhoneForWhatsApp(professional.phone)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium"
              style={{ color: "var(--primary)" }}
            >
              <MessageCircle className="size-4" />
              Escríbenos por WhatsApp
            </a>
          )}
          {professional.instagramHandle && (
            <a
              href={instagramUrl(professional.instagramHandle)}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium"
              style={{ color: "var(--primary)" }}
            >
              {professional.instagramHandle.startsWith("@")
                ? professional.instagramHandle
                : `@${professional.instagramHandle}`}
            </a>
          )}
        </section>
      )}
    </div>
  );
}
