import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionProfessional } from "@/server/interface/session-professional";
import { DrizzleStaffRepository } from "@/server/infrastructure/repositories/drizzle-staff.repository";
import { teamErrorResponse, teamUseCase } from "@/app/api/_team/wiring";

const schema = z.object({
  name: z.string().max(200),
  email: z.string().max(200).nullable().optional(),
});

/** El equipo, para los selectores del panel (SPEC 22). Solo la dueña. */
export async function GET() {
  const professional = await getSessionProfessional();
  if (!professional) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const team = await new DrizzleStaffRepository().listByProfessional(professional.id);
  return NextResponse.json({
    staff: team.map((s) => ({ id: s.id, name: s.name, active: s.active, isOwner: s.isOwner })),
  });
}

/** Agregar una integrante al equipo (SPEC 22). Solo la dueña. */
export async function POST(request: Request) {
  const professional = await getSessionProfessional();
  if (!professional) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    const staff = await teamUseCase().add(professional, { name: parsed.data.name, email: parsed.data.email || null });
    return NextResponse.json({ staff }, { status: 201 });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
