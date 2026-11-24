import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionProfessional } from "@/server/interface/session-professional";
import { commerceErrorResponse, invalid, packagesUseCase, unauthorized } from "@/app/api/_commerce/wiring";

const schema = z.object({ active: z.boolean() });

/** Activar o desactivar un paquete del catálogo (SPEC 21). Lo ya vendido no cambia. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const professional = await getSessionProfessional();
  if (!professional) return unauthorized();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return invalid();
  try {
    const pkg = await packagesUseCase().setActive(professional.id, id, parsed.data.active);
    return NextResponse.json({ package: pkg });
  } catch (err) {
    return commerceErrorResponse(err);
  }
}
