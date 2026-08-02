import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { UpdateTaglineUseCase } from "@/server/application/professional/update-tagline.use-case";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

const putTaglineSchema = z.object({
  tagline: z.string().nullable(),
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

  return NextResponse.json({ tagline: professional.tagline });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "professional") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const professional = await new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id);
  if (!professional) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = putTaglineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const tagline = parsed.data.tagline?.trim() || null;
  const useCase = new UpdateTaglineUseCase(new DrizzleProfessionalRepository());
  const updated = await useCase.execute(professional.id, tagline);

  return NextResponse.json({ tagline: updated.tagline });
}
