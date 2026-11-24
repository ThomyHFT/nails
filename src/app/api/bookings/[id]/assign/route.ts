import { NextResponse } from "next/server";
import { z } from "zod";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { getSessionProfessional } from "@/server/interface/session-professional";
import { teamErrorResponse, teamUseCase } from "@/app/api/_team/wiring";

const schema = z.object({ staffId: z.string().uuid() });

/** Reasignar una reserva a otra integrante (SPEC 22). Solo la dueña. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const professional = await getSessionProfessional();
  if (!professional) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  try {
    const booking = await teamUseCase().reassign(professional, new DrizzleBookingRepository(), id, parsed.data.staffId);
    return NextResponse.json({ booking });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
