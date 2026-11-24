import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionProfessional } from "@/server/interface/session-professional";
import { teamErrorResponse, teamUseCase } from "@/app/api/_team/wiring";

const schema = z.object({ email: z.string().max(200) });

/** Dar acceso propio a una integrante (SPEC 22): entra con el código por correo. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const professional = await getSessionProfessional();
  if (!professional) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  try {
    const staff = await teamUseCase().grantAccess(professional, id, parsed.data.email);
    return NextResponse.json({ staff });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
