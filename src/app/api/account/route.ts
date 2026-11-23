import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  AccountNotFoundError,
  AccountValidationError,
  UpdateContactUseCase,
} from "@/server/application/account/account.use-case";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";

const bodySchema = z.object({ name: z.string().max(120), phone: z.string().max(40) });

/** Nombre y teléfono de quien tiene la sesión (SPEC 20). */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    await new UpdateContactUseCase(new DrizzleUserRepository()).execute(session.user.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AccountValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof AccountNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
