import { NextResponse } from "next/server";
import { z } from "zod";
import { RequestLoginCodeUseCase } from "@/server/application/auth/email-code.use-case";
import { env } from "@/server/infrastructure/config/env";
import { ResendEmailSender } from "@/server/infrastructure/email/resend-email-sender";
import { DrizzleBrandingRepository } from "@/server/infrastructure/repositories/drizzle-branding.repository";
import { DrizzleEmailCodesRepository } from "@/server/infrastructure/repositories/drizzle-email-codes.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { CryptoTokenGenerator } from "@/server/infrastructure/security/crypto-token-generator";

const bodySchema = z.object({
  email: z.string().trim().email().max(254),
  slug: z.string().min(1).max(100),
});

/** Pide un código para entrar sin contraseña (SPEC 20). */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });

  const result = await new RequestLoginCodeUseCase(new DrizzleUserRepository(), {
    codes: new DrizzleEmailCodesRepository(),
    tokens: new CryptoTokenGenerator(),
    professionals: new DrizzleProfessionalRepository(),
    branding: new DrizzleBrandingRepository(),
    emailSender: env.RESEND_API_KEY
      ? new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM_ADDRESS ?? "onboarding@resend.dev")
      : null,
  }).execute(parsed.data);

  if (result.status === "rate_limited") {
    return NextResponse.json({ error: "Pediste varios códigos seguidos. Espera unos minutos y vuelve a intentar." }, { status: 429 });
  }
  if (result.status === "email_unavailable") {
    return NextResponse.json({ error: "No pudimos enviar el correo. Entra con tu contraseña o intenta más tarde." }, { status: 503 });
  }
  return NextResponse.json({ isNewClient: result.isNewClient });
}
