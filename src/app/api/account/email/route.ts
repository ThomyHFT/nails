import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  AccountNotFoundError,
  AccountValidationError,
  EmailTakenError,
  RequestEmailChangeUseCase,
} from "@/server/application/account/account.use-case";
import { env } from "@/server/infrastructure/config/env";
import { ResendEmailSender } from "@/server/infrastructure/email/resend-email-sender";
import { DrizzleBrandingRepository } from "@/server/infrastructure/repositories/drizzle-branding.repository";
import { DrizzleEmailCodesRepository } from "@/server/infrastructure/repositories/drizzle-email-codes.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { CryptoTokenGenerator } from "@/server/infrastructure/security/crypto-token-generator";

const bodySchema = z.object({ newEmail: z.string().trim().email().max(254), slug: z.string().min(1).max(100) });

/** Paso 1 del cambio de correo: envía un código al correo nuevo (SPEC 20). */
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });

  try {
    const status = await new RequestEmailChangeUseCase(new DrizzleUserRepository(), {
      codes: new DrizzleEmailCodesRepository(),
      tokens: new CryptoTokenGenerator(),
      professionals: new DrizzleProfessionalRepository(),
      branding: new DrizzleBrandingRepository(),
      emailSender: env.RESEND_API_KEY
        ? new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM_ADDRESS ?? "onboarding@resend.dev")
        : null,
    }).execute(session.user.id, parsed.data);

    if (status === "rate_limited") {
      return NextResponse.json({ error: "Pediste varios códigos seguidos. Espera unos minutos." }, { status: 429 });
    }
    if (status === "email_unavailable") {
      return NextResponse.json({ error: "No pudimos enviar el correo. Intenta más tarde." }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AccountValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof EmailTakenError) return NextResponse.json({ error: err.message }, { status: 409 });
    if (err instanceof AccountNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
