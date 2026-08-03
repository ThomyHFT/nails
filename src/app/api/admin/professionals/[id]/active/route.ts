import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  ProfessionalNotFoundError,
  ToggleProfessionalActiveUseCase,
} from "@/server/application/admin/toggle-professional-active.use-case";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

const patchActiveSchema = z.object({ active: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = patchActiveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const { id } = await params;
  const useCase = new ToggleProfessionalActiveUseCase(new DrizzleProfessionalRepository());

  try {
    const updated = await useCase.execute(id, parsed.data.active);
    return NextResponse.json({ active: updated.active });
  } catch (err) {
    if (err instanceof ProfessionalNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
