import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  AccountNotFoundError,
  AccountValidationError,
  ChangePasswordUseCase,
  WrongCurrentPasswordError,
} from "@/server/application/account/account.use-case";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { BcryptPasswordHasher } from "@/server/infrastructure/security/bcrypt-password-hasher";

const bodySchema = z.object({
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().max(200),
});

/** Cambiar o crear la contraseña (SPEC 20). */
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    await new ChangePasswordUseCase(new DrizzleUserRepository(), new BcryptPasswordHasher()).execute(
      session.user.id,
      parsed.data,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AccountValidationError || err instanceof WrongCurrentPasswordError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof AccountNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
