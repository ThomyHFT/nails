import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { SendEmailVerificationUseCase } from "@/server/application/auth/send-email-verification.use-case";
import { DrizzleEmailVerificationTokensRepository } from "@/server/infrastructure/repositories/drizzle-email-verification-tokens.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { CryptoTokenGenerator } from "@/server/infrastructure/security/crypto-token-generator";
import { ResendEmailSender } from "@/server/infrastructure/email/resend-email-sender";
import { env } from "@/server/infrastructure/config/env";

/** Reenvío del correo de verificación desde el banner del panel. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "professional") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [user, professional] = await Promise.all([
    new DrizzleUserRepository().findById(session.user.id),
    new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id),
  ]);

  if (!user || !professional) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const emailSender = env.RESEND_API_KEY
    ? new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM_ADDRESS ?? "onboarding@resend.dev")
    : null;

  const result = await new SendEmailVerificationUseCase(
    new DrizzleEmailVerificationTokensRepository(),
    new CryptoTokenGenerator(),
    emailSender,
  ).execute({
    userId: user.id,
    email: user.email,
    businessName: professional.businessName,
    baseUrl: new URL(request.url).origin,
  });

  if (result === "rate_limited") {
    return NextResponse.json({ error: "Ya pediste varios enlaces. Espera un rato antes de volver a intentar." }, {
      status: 429,
    });
  }
  if (result === "no_sender" || result === "send_failed") {
    return NextResponse.json({ error: "No se pudo enviar el correo. Intenta de nuevo en un rato." }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
