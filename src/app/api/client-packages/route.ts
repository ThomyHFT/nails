import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionProfessional } from "@/server/interface/session-professional";
import { commerceErrorResponse, invalid, packagesUseCase, unauthorized } from "@/app/api/_commerce/wiring";

const schema = z.object({ clientUserId: z.string().uuid(), packageId: z.string().uuid() });

/** Registrar la venta de un paquete a una clienta (SPEC 21). */
export async function POST(request: Request) {
  const professional = await getSessionProfessional();
  if (!professional) return unauthorized();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid();
  try {
    const sold = await packagesUseCase().sell(professional.id, parsed.data.clientUserId, parsed.data.packageId);
    return NextResponse.json({ clientPackage: sold }, { status: 201 });
  } catch (err) {
    return commerceErrorResponse(err);
  }
}
