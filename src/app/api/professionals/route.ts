import { NextResponse } from "next/server";
import { z } from "zod";
import {
  BusinessNameRequiredError,
  EmailTakenError,
  InvalidSlugFormatError,
  InviteCodeInvalidError,
  RegisterProfessionalUseCase,
  SlugUnavailableError,
  WeakPasswordError,
} from "@/server/application/tenant/register-professional.use-case";
import { SendEmailVerificationUseCase } from "@/server/application/auth/send-email-verification.use-case";
import { DrizzleInviteCodesRepository } from "@/server/infrastructure/repositories/drizzle-invite-codes.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleTenantProvisioningRepository } from "@/server/infrastructure/repositories/drizzle-tenant-provisioning.repository";
import { DrizzleEmailVerificationTokensRepository } from "@/server/infrastructure/repositories/drizzle-email-verification-tokens.repository";
import { BcryptPasswordHasher } from "@/server/infrastructure/security/bcrypt-password-hasher";
import { CryptoTokenGenerator } from "@/server/infrastructure/security/crypto-token-generator";
import { ResendEmailSender } from "@/server/infrastructure/email/resend-email-sender";
import { env } from "@/server/infrastructure/config/env";

const registerSchema = z.object({
  inviteCode: z.string().min(1),
  slug: z.string().min(1),
  businessName: z.string().min(1),
  vertical: z.enum(["nails", "barbershop", "wellness"]),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

function emailSender() {
  return env.RESEND_API_KEY ? new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM_ADDRESS ?? "onboarding@resend.dev") : null;
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const useCase = new RegisterProfessionalUseCase(
    new DrizzleInviteCodesRepository(),
    new DrizzleUserRepository(),
    new DrizzleProfessionalRepository(),
    new DrizzleTenantProvisioningRepository(),
    new BcryptPasswordHasher(),
  );

  try {
    const result = await useCase.execute(parsed.data);

    // Best effort: si el envío falla, la cuenta ya existe y el correo se
    // puede reenviar desde el panel. No revierte el registro.
    try {
      await new SendEmailVerificationUseCase(
        new DrizzleEmailVerificationTokensRepository(),
        new CryptoTokenGenerator(),
        emailSender(),
      ).execute({
        userId: result.userId,
        email: parsed.data.email,
        businessName: result.professional.businessName,
        baseUrl: new URL(request.url).origin,
      });
    } catch (err) {
      console.error("No se pudo enviar el correo de verificación", err);
    }

    return NextResponse.json(
      { slug: result.professional.slug, email: parsed.data.email },
      { status: 201 },
    );
  } catch (err) {
    if (
      err instanceof InviteCodeInvalidError ||
      err instanceof SlugUnavailableError ||
      err instanceof InvalidSlugFormatError ||
      err instanceof BusinessNameRequiredError ||
      err instanceof WeakPasswordError ||
      err instanceof EmailTakenError
    ) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
