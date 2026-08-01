import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/server/infrastructure/db/client";
import { serviceVariants, services } from "@/server/infrastructure/db/schema/services";
import { CreateBookingUseCase, SlotNotAvailableError } from "@/server/application/booking/create-booking.use-case";
import { GenerateAvailableSlotsUseCase } from "@/server/application/booking/generate-available-slots.use-case";
import { calculateDesignQuote, InvalidDesignElementError } from "@/server/domain/design/calculate-design-quote";
import type { NailDesignPayload } from "@/server/domain/design/nail-design-payload";
import { DrizzleAvailabilityRepository } from "@/server/infrastructure/repositories/drizzle-availability.repository";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleDesignRepository } from "@/server/infrastructure/repositories/drizzle-design.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

async function resolveProfessionalBySlug(slug: string) {
  return new DrizzleProfessionalRepository().findBySlug(slug);
}

async function resolveVariant(serviceVariantId: string, professionalId: string) {
  const [variant] = await db
    .select({
      id: serviceVariants.id,
      priceClp: serviceVariants.priceClp,
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
  const date = searchParams.get("date");
  const extraMinutesParam = searchParams.get("extraMinutes");
  const extraMinutes = extraMinutesParam ? Number(extraMinutesParam) : 0;

  if (!slug || !serviceVariantId || !date || !datePattern.test(date) || Number.isNaN(extraMinutes)) {
    return NextResponse.json({ error: "slug, serviceVariantId y date (YYYY-MM-DD) son requeridos" }, { status: 400 });
  }

  const professional = await resolveProfessionalBySlug(slug);
  if (!professional) {
    return NextResponse.json({ error: "Profesional no encontrada" }, { status: 404 });
  }

  const variant = await resolveVariant(serviceVariantId, professional.id);
  if (!variant) {
    return NextResponse.json({ error: "Variante no encontrada" }, { status: 404 });
  }

  const useCase = new GenerateAvailableSlotsUseCase(new DrizzleAvailabilityRepository(), new DrizzleBookingRepository());
  const slots = await useCase.execute({
    professionalId: professional.id,
    timezone: professional.timezone,
    bufferMinutes: professional.bufferMinutes,
    date,
    durationMinutes: variant.durationMinutes + extraMinutes,
  });

  return NextResponse.json({ slots });
}

const nailSchema = z.object({
  baseColorCode: z.string().min(1),
  baseColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  finish: z.string().min(1),
  decorations: z.array(z.string()),
});

const designPayloadSchema = z.object({
  version: z.literal(2),
  shape: z.enum(["almond", "coffin", "square", "round", "stiletto"]),
  technique: z.string().nullable(),
  nails: z.array(nailSchema).length(10),
});

const createBookingSchema = z.object({
  slug: z.string().min(1),
  serviceVariantId: z.string().uuid(),
  date: z.string().regex(datePattern),
  startsAt: z.string().datetime(),
  clientNote: z.string().nullable().optional(),
  design: z
    .object({
      payload: designPayloadSchema,
      expectedExtraPriceClp: z.number().int(),
      expectedExtraMinutes: z.number().int(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "client") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const professional = await resolveProfessionalBySlug(parsed.data.slug);
  if (!professional) {
    return NextResponse.json({ error: "Profesional no encontrada" }, { status: 404 });
  }

  const variant = await resolveVariant(parsed.data.serviceVariantId, professional.id);
  if (!variant) {
    return NextResponse.json({ error: "Variante no encontrada" }, { status: 404 });
  }

  let designPayload: NailDesignPayload | undefined;

  if (parsed.data.design) {
    const catalog = await new DrizzleDesignRepository().listElementsByProfessional(professional.id);

    let quote;
    try {
      quote = calculateDesignQuote(parsed.data.design.payload, catalog);
    } catch (err) {
      if (err instanceof InvalidDesignElementError) {
        return NextResponse.json({ error: err.message }, { status: 409 });
      }
      throw err;
    }

    if (
      quote.extraPriceClp !== parsed.data.design.expectedExtraPriceClp ||
      quote.extraMinutes !== parsed.data.design.expectedExtraMinutes
    ) {
      return NextResponse.json(
        {
          error: "El catálogo cambió mientras diseñabas. Revisá el diseño y volvé a intentar.",
          extraPriceClp: quote.extraPriceClp,
          extraMinutes: quote.extraMinutes,
        },
        { status: 409 },
      );
    }

    designPayload = parsed.data.design.payload;
  }

  const useCase = new CreateBookingUseCase(
    new DrizzleAvailabilityRepository(),
    new DrizzleBookingRepository(),
    new DrizzleDesignRepository(),
  );

  try {
    const booking = await useCase.execute({
      professionalId: professional.id,
      timezone: professional.timezone,
      bufferMinutes: professional.bufferMinutes,
      clientUserId: session.user.id,
      serviceVariantId: variant.id,
      date: parsed.data.date,
      startsAt: parsed.data.startsAt,
      priceClp: variant.priceClp,
      durationMinutes: variant.durationMinutes,
      designPayload,
      clientNote: parsed.data.clientNote,
    });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    if (err instanceof SlotNotAvailableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
