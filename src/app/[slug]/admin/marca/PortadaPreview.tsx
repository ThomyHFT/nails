import type { ReactNode } from "react";
import { CalendarDays, MessageCircle, Star } from "lucide-react";
import {
  Band,
  BrandButton,
  ContactCard,
  FloatingStat,
  Hero,
  MediaFrame,
  RatingSummary,
  ReviewCard,
  Section,
  SectionHeading,
  ServiceCard,
} from "@/components/brand";
import type { BrandFontPair, BrandTokenSet } from "@/server/domain/branding/brand-tokens";
import type { HeroLayout, PortadaSection } from "@/server/domain/branding/portada-layout";
import { tenantBrandStyle } from "@/app/[slug]/admin/marca/tenant-brand-style";

const PLACEHOLDER_SERVICES = [
  {
    id: "preview-servicio-1",
    name: "Servicio destacado",
    description: "Descripción breve de en qué consiste, para que la clienta sepa qué esperar.",
    priceFromClp: 15000,
    durationMinutes: 45,
    imageUrl: null,
  },
  {
    id: "preview-servicio-2",
    name: "Otro servicio",
    description: "Otra descripción de ejemplo, del mismo largo que la real.",
    priceFromClp: 25000,
    durationMinutes: 60,
    imageUrl: null,
  },
];

const PLACEHOLDER_REVIEWS = [
  { id: "preview-review-1", rating: 5, body: "Excelente atención, quedé muy conforme con el resultado." },
  { id: "preview-review-2", rating: 4, body: "Buena experiencia en general, volvería a reservar." },
];

/**
 * Maqueta real de la portada (SPEC 15): mismos componentes de marca que usa
 * `/[slug]`, con datos de relleno en vez de los del tenant. Vive dentro de
 * `.tenant-brand` con los tokens del formulario en edición — no los que ya
 * están guardados — para que reaccione en cada cambio sin pasar por la API.
 */
export function PortadaPreview({
  businessName,
  tokens,
  fontPair,
  heroLayout,
  sections,
  coverImageUrl,
}: {
  businessName: string;
  tokens: BrandTokenSet;
  fontPair: BrandFontPair;
  heroLayout: HeroLayout;
  sections: PortadaSection[];
  coverImageUrl: string | null;
}) {
  const galleryImage = coverImageUrl ?? "";

  const blocksBySection: Record<PortadaSection, ReactNode> = {
    servicios: (
      <div key="servicios" className="px-4">
        <Band level={2}>
          <SectionHeading title="Servicios destacados" className="mb-6" />
          {/* Una columna siempre: a este ancho de sidebar, dos tarjetas lado a
              lado quedan apretadas aunque el navegador sea de escritorio. */}
          <div className="flex flex-col gap-4">
            {PLACEHOLDER_SERVICES.map((service) => (
              <ServiceCard key={service.id} href="#" service={service} />
            ))}
          </div>
        </Band>
      </div>
    ),
    galeria: (
      <Section key="galeria" className="flex flex-col gap-4">
        <SectionHeading align="start" title="Nuestro trabajo" />
        {/* Grilla fija de 2 columnas en vez de `GalleryGrid`: sus columnas se
            activan por ancho de ventana, no del sidebar, y a 4 columnas acá
            las fotos quedan diminutas. */}
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <MediaFrame key={i} src={galleryImage || null} alt="" ratio="square" />
          ))}
        </div>
      </Section>
    ),
    opiniones: (
      <Section key="opiniones" className="flex flex-col gap-4">
        <SectionHeading
          align="start"
          title="Lo que dicen"
          action={<RatingSummary average={4.5} count={PLACEHOLDER_REVIEWS.length} />}
        />
        <div className="flex flex-col gap-3">
          {PLACEHOLDER_REVIEWS.map((review) => (
            <ReviewCard key={review.id} rating={review.rating} body={review.body} authorName="Cliente" />
          ))}
        </div>
      </Section>
    ),
    contacto: (
      <Section key="contacto">
        <ContactCard
          icon={<MessageCircle className="size-7" />}
          title="¿Tienes alguna duda especial?"
          description="Escríbeme directamente por WhatsApp y te oriento antes de que reserves."
          action={<BrandButton size="lg">Contactar por WhatsApp</BrandButton>}
        />
      </Section>
    ),
  };

  return (
    <div
      className="tenant-brand overflow-hidden rounded-lg border border-border bg-background text-[0.85em] text-foreground"
      style={{ ...tenantBrandStyle(tokens, fontPair), fontFamily: "var(--tenant-font-body)" }}
    >
      <div className="max-h-160 overflow-y-auto">
        <Hero
          layout={heroLayout}
          title={businessName}
          description="Reserva tu hora en línea, sin llamadas ni mensajes de ida y vuelta."
          imageUrl={coverImageUrl}
          imageAlt={businessName}
          primaryAction={
            <BrandButton size="lg" icon={<CalendarDays className="size-4" />}>
              Reservar hora
            </BrandButton>
          }
          badge={<FloatingStat icon={<Star className="size-5" />} value="4,5" label="12 opiniones" />}
        />
        {sections.map((section) => blocksBySection[section])}
      </div>
    </div>
  );
}
