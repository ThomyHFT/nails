import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionProfessional } from "@/server/interface/session-professional";
import { commerceErrorResponse, invalid, packagesUseCase, unauthorized } from "@/app/api/_commerce/wiring";

const schema = z.object({
  serviceId: z.string().uuid(),
  name: z.string(),
  sessions: z.number().int(),
  priceClp: z.number().int(),
});

/** Agregar un paquete al catálogo (SPEC 21). */
export async function POST(request: Request) {
  const professional = await getSessionProfessional();
  if (!professional) return unauthorized();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid();
  try {
    const pkg = await packagesUseCase().create(professional.id, parsed.data);
    return NextResponse.json({ package: pkg }, { status: 201 });
  } catch (err) {
    return commerceErrorResponse(err);
  }
}
