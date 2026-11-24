import { NextResponse } from "next/server";
import { z } from "zod";
import {
  InvalidCommerceSettingsError,
  UpdateCommerceUseCase,
} from "@/server/application/professional/update-commerce.use-case";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { getSessionProfessional } from "@/server/interface/session-professional";

const field = z.string().max(120);
const schema = z.object({
  depositClp: z.number().int().nullable(),
  bankDetails: z
    .object({
      bank: field,
      accountType: field,
      accountNumber: field,
      holderName: field,
      holderRut: field,
      email: field,
    })
    .nullable(),
  rebookAfterDays: z.number().int().nullable(),
  giftCardsEnabled: z.boolean(),
});

export async function GET() {
  const professional = await getSessionProfessional();
  if (!professional) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ commerce: professional.commerce });
}

/** Abono, "vuelve a reservar" y gift cards de la profesional (SPEC 21). */
export async function PUT(request: Request) {
  const professional = await getSessionProfessional();
  if (!professional) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    const updated = await new UpdateCommerceUseCase(new DrizzleProfessionalRepository()).execute(
      professional.id,
      parsed.data,
    );
    return NextResponse.json({ commerce: updated.commerce });
  } catch (err) {
    if (err instanceof InvalidCommerceSettingsError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
