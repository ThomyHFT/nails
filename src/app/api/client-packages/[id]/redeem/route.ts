import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionProfessional } from "@/server/interface/session-professional";
import { commerceErrorResponse, invalid, packagesUseCase, unauthorized } from "@/app/api/_commerce/wiring";

const schema = z.object({ bookingId: z.string().uuid().nullable().optional() });
const uuid = z.string().uuid();

/** Usar una sesión del paquete (SPEC 21). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const professional = await getSessionProfessional();
  if (!professional) return unauthorized();
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success || !uuid.safeParse(id).success) return invalid();
  try {
    await packagesUseCase().redeem(professional.id, id, parsed.data.bookingId ?? null);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return commerceErrorResponse(err);
  }
}

/** Deshacer la última sesión usada. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const professional = await getSessionProfessional();
  if (!professional) return unauthorized();
  if (!uuid.safeParse(id).success) return invalid();
  try {
    await packagesUseCase().undo(professional.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return commerceErrorResponse(err);
  }
}
