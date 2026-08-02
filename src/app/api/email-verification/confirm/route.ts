import { NextResponse } from "next/server";
import { ConfirmEmailVerificationUseCase } from "@/server/application/auth/confirm-email-verification.use-case";
import { DrizzleEmailVerificationTokensRepository } from "@/server/infrastructure/repositories/drizzle-email-verification-tokens.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { CryptoTokenGenerator } from "@/server/infrastructure/security/crypto-token-generator";

/**
 * `GET` y no `POST`: el link del correo tiene que poder abrirse con un click,
 * sin JS de por medio. La escritura (marcar el token usado, verificar el
 * correo, publicar el tenant) vive acá y no en el Server Component de la
 * página — la regla del proyecto es que toda escritura pasa por un Route
 * Handler.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${origin}/verificar-invalido`);
  }

  const useCase = new ConfirmEmailVerificationUseCase(
    new DrizzleEmailVerificationTokensRepository(),
    new DrizzleUserRepository(),
    new DrizzleProfessionalRepository(),
    new CryptoTokenGenerator(),
  );

  try {
    await useCase.execute(token);
    return NextResponse.redirect(`${origin}/verificado`);
  } catch {
    return NextResponse.redirect(`${origin}/verificar-invalido`);
  }
}
