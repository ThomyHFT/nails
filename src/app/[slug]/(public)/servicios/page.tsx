import { notFound } from "next/navigation";
import { Tag } from "lucide-react";
import { GetProfessionalBySlugUseCase } from "@/server/application/tenant/get-professional-by-slug.use-case";
import { ListServicesUseCase } from "@/server/application/service/list-services.use-case";
import { priceFromClp } from "@/server/domain/service/price-from";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import {
  BrandButton,
  Caption,
  Container,
  Display,
  EmptyState,
  MediaFrame,
  Panel,
  Price,
  Section,
  Title,
  VariantRow,
} from "@/components/brand";

export default async function ServiciosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const professional = await new GetProfessionalBySlugUseCase(new DrizzleProfessionalRepository()).execute(slug);
  if (!professional) {
    notFound();
  }

  const allServices = await new ListServicesUseCase(new DrizzleServicesRepository()).execute(professional.id);

  const publicServices = allServices
    .filter((s) => s.active)
    .map((s) => ({ ...s, priceFrom: priceFromClp(s.variants) }))
    .filter((s): s is typeof s & { priceFrom: number } => s.priceFrom !== null);

  return (
    <Container size="md">
      <Section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Display as="h1">Servicios</Display>
          <Caption>Precios en pesos chilenos. El pago es presencial, al terminar el servicio.</Caption>
        </div>

        {publicServices.length === 0 ? (
          <EmptyState
            icon={<Tag className="size-5" />}
            title="Todavía no hay servicios publicados"
            description="Escríbenos y te contamos qué podemos hacer mientras tanto."
          />
        ) : (
          <div className="flex flex-col gap-5">
            {publicServices.map((service) => {
              const activeVariants = service.variants.filter((v) => v.active);
              return (
                <Panel key={service.id} className="flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    {service.imageUrl && (
                      <MediaFrame
                        src={service.imageUrl}
                        alt={service.name}
                        ratio="square"
                        className="size-20 shrink-0"
                      />
                    )}
                    <div className="flex flex-1 flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-4">
                        <Title>{service.name}</Title>
                        <Price clp={service.priceFrom} prefix="Desde" size="md" className="shrink-0" />
                      </div>
                      {service.description && <Caption>{service.description}</Caption>}
                    </div>
                  </div>

                  {/* Cada variante enlaza a la reserva con el servicio ya
                      elegido: el catálogo es donde se decide, no una lista de
                      precios que obligue a empezar el flujo de cero. */}
                  <div className="-mx-3 flex flex-col">
                    {activeVariants.map((variant) => (
                      <VariantRow
                        key={variant.id}
                        label={variant.label}
                        durationMinutes={variant.durationMinutes}
                        priceClp={variant.priceClp}
                        href={`/${slug}/reservar?service=${service.id}&variant=${variant.id}`}
                      />
                    ))}
                  </div>

                  <BrandButton
                    variant="outline"
                    size="sm"
                    className="self-start"
                    href={`/${slug}/reservar?service=${service.id}`}
                  >
                    Reservar
                  </BrandButton>
                </Panel>
              );
            })}
          </div>
        )}
      </Section>
    </Container>
  );
}
