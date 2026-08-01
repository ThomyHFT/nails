import { inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, MessageCircle, Star } from "lucide-react";
import { GetProfessionalBySlugUseCase } from "@/server/application/tenant/get-professional-by-slug.use-case";
import { GetTenantBrandingUseCase } from "@/server/application/branding/get-tenant-branding.use-case";
import { ListPortfolioUseCase } from "@/server/application/portfolio/list-portfolio.use-case";
import { ListReviewsUseCase } from "@/server/application/review/list-reviews.use-case";
import { ListServicesUseCase } from "@/server/application/service/list-services.use-case";
import { priceFromClp } from "@/server/domain/service/price-from";
import { ratingSummary } from "@/server/domain/review/rating-summary";
import { reviewerDisplayName } from "@/server/domain/review/reviewer-display-name";
import { db } from "@/server/infrastructure/db/client";
import { users } from "@/server/infrastructure/db/schema/users";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleBrandingRepository } from "@/server/infrastructure/repositories/drizzle-branding.repository";
import { DrizzlePortfolioRepository } from "@/server/infrastructure/repositories/drizzle-portfolio.repository";
import { DrizzleReviewsRepository } from "@/server/infrastructure/repositories/drizzle-reviews.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import {
  ActionLink,
  Band,
  BrandButton,
  Container,
  ContactCard,
  FloatingStat,
  GalleryGrid,
  Hero,
  RatingSummary,
  ReviewCard,
  Section,
  SectionHeading,
  ServiceCard,
} from "@/components/brand";
import { instagramLabel, instagramUrl, whatsAppUrl } from "@/app/[slug]/(public)/links";

const FEATURED_SERVICES_LIMIT = 4;
const PORTFOLIO_PREVIEW_LIMIT = 8;
const REVIEWS_PREVIEW_LIMIT = 3;

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
    .map((s) => {
      const activeVariants = s.variants.filter((v) => v.active);
      return {
        id: s.id,
        name: s.name,
        description: s.description,
        priceFrom: priceFromClp(s.variants),
        // La duración que se muestra es la de la variante más corta, igual que
        // el precio "desde": ambos son el piso. Mostrar la más larga asustaría
        // sin motivo a quien todavía no eligió el largo.
        durationMinutes: activeVariants.length ? Math.min(...activeVariants.map((v) => v.durationMinutes)) : null,
      };
    })
    .filter((s): s is typeof s & { priceFrom: number } => s.priceFrom !== null)
    .slice(0, FEATURED_SERVICES_LIMIT);

  const portfolioItems = (
    await new ListPortfolioUseCase(new DrizzlePortfolioRepository()).execute(professional.id, {
      onlyPublished: true,
    })
  ).slice(0, PORTFOLIO_PREVIEW_LIMIT);

  const publicReviews = await new ListReviewsUseCase(new DrizzleReviewsRepository()).listPublic(professional.id);
  const reviewsSummary = ratingSummary(publicReviews);
  const previewReviews = publicReviews.slice(0, REVIEWS_PREVIEW_LIMIT);
  const reviewClientIds = Array.from(new Set(previewReviews.map((review) => review.clientUserId)));
  const reviewClientRows = reviewClientIds.length
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, reviewClientIds))
    : [];
  const reviewerNameById = new Map(reviewClientRows.map((client) => [client.id, client.name]));

  return (
    <Container size="xl" className="flex flex-col">
      <Hero
        eyebrow={professional.instagramHandle ? instagramLabel(professional.instagramHandle) : undefined}
        title={professional.businessName}
        description={professional.bio}
        imageUrl={branding?.coverImageUrl ?? null}
        imageAlt={professional.businessName}
        primaryAction={
          <BrandButton size="lg" fullWidth href={`/${slug}/reservar`} icon={<CalendarDays className="size-4" />}>
            Reservar hora
          </BrandButton>
        }
        secondaryAction={
          professional.phone ? (
            <BrandButton size="lg" variant="outline" fullWidth href={whatsAppUrl(professional.phone)}>
              Contactar
            </BrandButton>
          ) : undefined
        }
        badge={
          reviewsSummary ? (
            <FloatingStat
              icon={<Star className="size-5" />}
              value={reviewsSummary.average.toFixed(1).replace(".", ",")}
              label={`${reviewsSummary.count} ${reviewsSummary.count === 1 ? "opinión" : "opiniones"}`}
            />
          ) : undefined
        }
      />

      {featuredServices.length > 0 && (
        <div className="px-5">
          {/* Nivel 2 y no 1: la banda tiene que despegarse del fondo *y* de las
              tarjetas que lleva dentro, y con un solo escalón las tres capas
              quedaban indistinguibles en tenants de fondo muy claro. */}
          <Band level={2} id="servicios">
            <SectionHeading
              title="Servicios destacados"
              subtitle="Elige el servicio, el largo y la hora. El pago es presencial, al terminar."
              className="mb-10"
            />
            <div className="grid gap-5 md:grid-cols-2">
              {featuredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  href={`/${slug}/reservar?service=${service.id}`}
                  service={{
                    id: service.id,
                    name: service.name,
                    description: service.description,
                    priceFromClp: service.priceFrom,
                    durationMinutes: service.durationMinutes,
                  }}
                />
              ))}
            </div>
            <div className="mt-10 flex justify-center">
              <BrandButton variant="outline" href={`/${slug}/servicios`}>
                Ver todos los servicios
              </BrandButton>
            </div>
          </Band>
        </div>
      )}

      {portfolioItems.length > 0 && (
        <Section id="galeria" className="flex flex-col gap-6">
          <SectionHeading
            align="start"
            title="Nuestro trabajo"
            subtitle={
              professional.instagramHandle
                ? `Síguenos en Instagram ${instagramLabel(professional.instagramHandle)}`
                : undefined
            }
            action={
              professional.instagramHandle ? (
                <a
                  href={instagramUrl(professional.instagramHandle)}
                  target="_blank"
                  rel="noreferrer"
                  className="t-label hidden text-primary transition-colors hover:underline sm:inline-flex"
                >
                  Ver más
                </a>
              ) : undefined
            }
          />
          <GalleryGrid items={portfolioItems.map((item) => ({ id: item.id, imageUrl: item.imageUrl, alt: "" }))} />
        </Section>
      )}

      {reviewsSummary && (
        <Section id="opiniones" className="flex flex-col gap-6">
          <SectionHeading
            align="start"
            title="Lo que dicen las clientas"
            action={<RatingSummary average={reviewsSummary.average} count={reviewsSummary.count} />}
          />
          <div className="grid gap-4 md:grid-cols-3">
            {previewReviews.map((review) => {
              const clientName = reviewerNameById.get(review.clientUserId);
              return (
                <ReviewCard
                  key={review.id}
                  rating={review.rating}
                  body={review.body}
                  photoUrl={review.photoUrl}
                  authorName={clientName ? reviewerDisplayName(clientName) : null}
                  authorInstagram={review.authorInstagram}
                />
              );
            })}
          </div>
          <ActionLink href={`/${slug}/opiniones`} icon={<ArrowRight className="size-4" />}>
            Ver todas las opiniones
          </ActionLink>
        </Section>
      )}

      {professional.phone && (
        <Section>
          <ContactCard
            icon={<MessageCircle className="size-7" />}
            title="¿Tienes alguna duda especial?"
            description="Escríbeme directamente por WhatsApp. Estaré feliz de asesorarte sobre qué servicio es el ideal para ti."
            action={
              <BrandButton size="lg" href={whatsAppUrl(professional.phone)}>
                Contactar por WhatsApp
              </BrandButton>
            }
          />
        </Section>
      )}
    </Container>
  );
}
