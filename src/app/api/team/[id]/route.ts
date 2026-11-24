import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionProfessional } from "@/server/interface/session-professional";
import { teamErrorResponse, teamUseCase } from "@/app/api/_team/wiring";

const schema = z.object({
  name: z.string().max(200).optional(),
  active: z.boolean().optional(),
  allServices: z.boolean().optional(),
  serviceIds: z.array(z.string().uuid()).max(200).optional(),
});

/** Editar una integrante: nombre, activa, servicios (SPEC 22). Solo la dueña. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const professional = await getSessionProfessional();
  if (!professional) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  try {
    const staff = await teamUseCase().update(professional, id, parsed.data);
    return NextResponse.json({ staff });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
