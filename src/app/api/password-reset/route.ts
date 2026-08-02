import { NextResponse } from "next/server";
import { z } from "zod";
import { RequestPasswordResetUseCase } from "@/server/application/auth/request-password-reset.use-case";
import { env } from "@/server/infrastructure/config/env";
import { CryptoTokenGenerator } from "@/server/infrastructure/security/crypto-token-generator";
import { ResendEmailSender } from "@/server/infrastructure/email/resend-email-sender";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleBrandingRepository } from "@/server/infrastructure/repositories/drizzle-branding.repository";
import { DrizzlePasswordResetTokensRepository } from "@/server/infrastructure/repositories/drizzle-password-reset-tokens.repository";

const requestResetSchema = z.object({
  email: z.string().email(),
  slug: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestResetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const useCase = new RequestPasswordResetUseCase(
    new DrizzleUserRepository(),
    new DrizzleProfessionalRepository(),
    new DrizzleBrandingRepository(),
    new DrizzlePasswordResetTokensRepository(),
    new CryptoTokenGenerator(),
    env.RESEND_API_KEY
      ? new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM_ADDRESS ?? "onboarding@resend.dev")
      : null,
  );

  const result = await useCase.execute({
    email: parsed.data.email,
    slug: parsed.data.slug,
    baseUrl: new URL(request.url).origin,
  });

  if (result === "rate_limited") {
    return NextResponse.json({ error: "Demasiadas solicitudes. Intenta de nuevo más tarde." }, { status: 429 });
  }

  return NextResponse.json({
    message: "Si el correo existe, te enviamos instrucciones para recuperar tu contraseña.",
  });
}
