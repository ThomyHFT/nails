import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { SetPlanUseCase, TeamError } from "@/server/application/staff/team.use-case";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleStaffRepository } from "@/server/infrastructure/repositories/drizzle-staff.repository";

const schema = z.object({ plan: z.enum(["solo", "salon"]), staffLimit: z.number().int() });

/** Plan y tope de integrantes de un negocio (SPEC 22). Solo el superadmin. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  try {
    const updated = await new SetPlanUseCase(new DrizzleProfessionalRepository(), new DrizzleStaffRepository()).execute(
      id,
      parsed.data.plan,
      parsed.data.staffLimit,
    );
    return NextResponse.json({ plan: updated.plan, staffLimit: updated.staffLimit });
  } catch (err) {
    if (err instanceof TeamError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
