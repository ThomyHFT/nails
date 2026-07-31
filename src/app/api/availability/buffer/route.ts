import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { UpdateBufferMinutesUseCase } from "@/server/application/availability/update-buffer-minutes.use-case";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

const updateBufferSchema = z.object({
  bufferMinutes: z.number().int().min(0).max(240),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "professional") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const professional = await new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id);
  if (!professional) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json({ bufferMinutes: professional.bufferMinutes });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "professional") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const professionalRepository = new DrizzleProfessionalRepository();
  const professional = await professionalRepository.findByOwnerUserId(session.user.id);
  if (!professional) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateBufferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const useCase = new UpdateBufferMinutesUseCase(professionalRepository);
  const updated = await useCase.execute(professional.id, parsed.data.bufferMinutes);
  return NextResponse.json({ bufferMinutes: updated.bufferMinutes });
}
