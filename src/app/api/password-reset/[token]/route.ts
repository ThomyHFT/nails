import { NextResponse } from "next/server";
import { z } from "zod";
import { ResetPasswordUseCase } from "@/server/application/auth/reset-password.use-case";
import { CryptoTokenGenerator } from "@/server/infrastructure/security/crypto-token-generator";
import { BcryptPasswordHasher } from "@/server/infrastructure/security/bcrypt-password-hasher";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { DrizzlePasswordResetTokensRepository } from "@/server/infrastructure/repositories/drizzle-password-reset-tokens.repository";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

const RESULT_MESSAGES: Record<string, string> = {
  invalid: "Este enlace no es válido.",
  expired: "Este enlace expiró. Pide uno nuevo.",
  used: "Este enlace ya fue usado. Pide uno nuevo.",
};

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const useCase = new ResetPasswordUseCase(
    new DrizzlePasswordResetTokensRepository(),
    new DrizzleUserRepository(),
    new CryptoTokenGenerator(),
    new BcryptPasswordHasher(),
  );

  const result = await useCase.execute({ token, newPassword: parsed.data.newPassword });

  if (result !== "ok") {
    return NextResponse.json({ error: RESULT_MESSAGES[result] }, { status: 400 });
  }

  return NextResponse.json({ message: "Tu contraseña se actualizó." });
}
