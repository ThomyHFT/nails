import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  AccountValidationError,
  ConfirmEmailChangeUseCase,
  EmailTakenError,
} from "@/server/application/account/account.use-case";
import { DrizzleEmailCodesRepository } from "@/server/infrastructure/repositories/drizzle-email-codes.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { CryptoTokenGenerator } from "@/server/infrastructure/security/crypto-token-generator";

const bodySchema = z.object({ newEmail: z.string().trim().email().max(254), code: z.string().regex(/^\d{6}$/) });

/** Paso 2 del cambio de correo: aplica el correo nuevo con el código correcto (SPEC 20). */
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "El código tiene 6 dígitos." }, { status: 400 });

  try {
    await new ConfirmEmailChangeUseCase(
      new DrizzleUserRepository(),
      new DrizzleEmailCodesRepository(),
      new CryptoTokenGenerator(),
    ).execute(session.user.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AccountValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof EmailTakenError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
