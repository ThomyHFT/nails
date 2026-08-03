import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { CreateInviteCodeUseCase } from "@/server/application/admin/create-invite-code.use-case";
import { DrizzleInviteCodesRepository } from "@/server/infrastructure/repositories/drizzle-invite-codes.repository";

const postInviteCodeSchema = z.object({
  note: z.string().nullable(),
  expiresInDays: z.number().int().positive().nullable(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = postInviteCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const useCase = new CreateInviteCodeUseCase(new DrizzleInviteCodesRepository());
  const code = await useCase.execute({
    note: parsed.data.note?.trim() || null,
    expiresInDays: parsed.data.expiresInDays,
  });

  return NextResponse.json({ code });
}
