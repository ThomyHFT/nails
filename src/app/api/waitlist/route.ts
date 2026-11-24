import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { GetProfessionalBySlugUseCase } from "@/server/application/tenant/get-professional-by-slug.use-case";
import {
  JoinWaitlistUseCase,
  WaitlistLimitError,
  WaitlistPastDateError,
} from "@/server/application/waitlist/waitlist.use-case";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import { DrizzleWaitlistRepository } from "@/server/infrastructure/repositories/drizzle-waitlist.repository";

const schema = z.object({
  slug: z.string().min(1),
  serviceVariantId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Anotarse en la lista de espera de un día (SPEC 21). */
export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "client") {
    return NextResponse.json({ error: "Inicia sesión para anotarte" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const professional = await new GetProfessionalBySlugUseCase(new DrizzleProfessionalRepository()).execute(
    parsed.data.slug,
  );
  if (!professional) return NextResponse.json({ error: "Profesional no encontrada" }, { status: 404 });

  const variant = await new DrizzleServicesRepository().findVariantById(parsed.data.serviceVariantId, professional.id);
  if (!variant || !variant.active) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

  try {
    const entry = await new JoinWaitlistUseCase(new DrizzleWaitlistRepository()).execute({
      professionalId: professional.id,
      timezone: professional.timezone,
      clientUserId: session.user.id,
      serviceVariantId: variant.id,
      date: parsed.data.date,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    if (err instanceof WaitlistPastDateError || err instanceof WaitlistLimitError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
