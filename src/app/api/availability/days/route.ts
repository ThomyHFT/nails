import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/server/infrastructure/db/client";
import { serviceVariants, services } from "@/server/infrastructure/db/schema/services";
import { ListDaysWithSlotsUseCase } from "@/server/application/booking/list-days-with-slots.use-case";
import { DrizzleAvailabilityRepository } from "@/server/infrastructure/repositories/drizzle-availability.repository";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

const monthPattern = /^\d{4}-\d{2}-01$/;

async function resolveVariant(serviceVariantId: string, professionalId: string) {
  const [variant] = await db
    .select({
      id: serviceVariants.id,
      durationMinutes: serviceVariants.durationMinutes,
      professionalId: services.professionalId,
      active: serviceVariants.active,
    })
    .from(serviceVariants)
    .innerJoin(services, eq(serviceVariants.serviceId, services.id))
    .where(eq(serviceVariants.id, serviceVariantId))
    .limit(1);

  if (!variant || !variant.active || variant.professionalId !== professionalId) {
    return null;
  }

  return variant;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const serviceVariantId = searchParams.get("serviceVariantId");
  const month = searchParams.get("month");

  if (!slug || !serviceVariantId || !month || !monthPattern.test(month)) {
    return NextResponse.json(
      { error: "slug, serviceVariantId y month (YYYY-MM-01) son requeridos" },
      { status: 400 },
    );
  }

  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  if (!professional) {
    return NextResponse.json({ error: "Profesional no encontrada" }, { status: 404 });
  }

  const variant = await resolveVariant(serviceVariantId, professional.id);
  if (!variant) {
    return NextResponse.json({ error: "Variante no encontrada" }, { status: 404 });
  }

  const useCase = new ListDaysWithSlotsUseCase(new DrizzleAvailabilityRepository(), new DrizzleBookingRepository());
  const days = await useCase.execute({
    professionalId: professional.id,
    timezone: professional.timezone,
    bufferMinutes: professional.bufferMinutes,
    month,
    durationMinutes: variant.durationMinutes,
  });

  return NextResponse.json({ days });
}
