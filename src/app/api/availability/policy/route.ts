import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

/** Límites razonables: evitan valores que dejan la agenda sin horarios por error de tipeo. */
const policySchema = z.object({
  autoConfirm: z.boolean(),
  slotIntervalMinutes: z.number().int().min(5).max(240).nullable(),
  minLeadMinutes: z.number().int().min(0).max(14 * 24 * 60),
  maxAdvanceDays: z.number().int().min(1).max(365).nullable(),
  cancellationDeadlineHours: z.number().int().min(0).max(14 * 24),
});

async function requireProfessional() {
  const session = await auth();
  if (!session || session.user.role !== "professional") return null;
  return new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id);
}

/** Reglas de reserva de la profesional (SPEC 19). */
export async function GET() {
  const professional = await requireProfessional();
  if (!professional) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({ policy: professional.bookingPolicy });
}

export async function POST(request: Request) {
  const professional = await requireProfessional();
  if (!professional) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const parsed = policySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const updated = await new DrizzleProfessionalRepository().updateBookingPolicy(professional.id, parsed.data);
  return NextResponse.json({ policy: updated.bookingPolicy });
}
