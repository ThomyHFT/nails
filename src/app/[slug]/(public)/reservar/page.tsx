import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { GetProfessionalBySlugUseCase } from "@/server/application/tenant/get-professional-by-slug.use-case";
import { db } from "@/server/infrastructure/db/client";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { serviceVariants, services } from "@/server/infrastructure/db/schema/services";
import { ReservarForm, type ServiceOption } from "@/app/[slug]/(public)/reservar/ReservarForm";

export default async function ReservarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string; variant?: string }>;
}) {
  const { slug } = await params;
  const { service: preselectedServiceId, variant: preselectedVariantId } = await searchParams;

  const useCase = new GetProfessionalBySlugUseCase(new DrizzleProfessionalRepository());
  const professional = await useCase.execute(slug);
  if (!professional) {
    notFound();
  }

  const rows = await db
    .select({
      serviceId: services.id,
      serviceName: services.name,
      variantId: serviceVariants.id,
      label: serviceVariants.label,
      priceClp: serviceVariants.priceClp,
      durationMinutes: serviceVariants.durationMinutes,
    })
    .from(services)
    .innerJoin(serviceVariants, eq(serviceVariants.serviceId, services.id))
    .where(
      and(eq(services.professionalId, professional.id), eq(services.active, true), eq(serviceVariants.active, true)),
    );

  const serviceMap = new Map<string, ServiceOption>();
  for (const row of rows) {
    if (!serviceMap.has(row.serviceId)) {
      serviceMap.set(row.serviceId, { id: row.serviceId, name: row.serviceName, variants: [] });
    }
    serviceMap.get(row.serviceId)!.variants.push({
      id: row.variantId,
      label: row.label ?? "—",
      priceClp: row.priceClp,
      durationMinutes: row.durationMinutes,
    });
  }

  const serviceOptions = Array.from(serviceMap.values());
  const initialService = serviceOptions.find((s) => s.id === preselectedServiceId);
  // La variante solo se acepta si pertenece al servicio preseleccionado: un
  // `?variant=` de otro servicio dejaría el formulario en un estado imposible.
  const initialVariantId = initialService?.variants.some((v) => v.id === preselectedVariantId)
    ? preselectedVariantId
    : undefined;

  return (
    <ReservarForm
      slug={slug}
      services={serviceOptions}
      initialServiceId={initialService?.id}
      initialVariantId={initialVariantId}
      vertical={professional.vertical}
    />
  );
}
