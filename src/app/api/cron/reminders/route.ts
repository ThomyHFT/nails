import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { SendRemindersUseCase } from "@/server/application/notification/send-reminders.use-case";
import { env } from "@/server/infrastructure/config/env";
import { ResendEmailSender } from "@/server/infrastructure/email/resend-email-sender";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleBrandingRepository } from "@/server/infrastructure/repositories/drizzle-branding.repository";
import { DrizzleEmailNotificationRepository } from "@/server/infrastructure/repositories/drizzle-email-notification.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";

export const dynamic = "force-dynamic";

function authorized(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header ?? "");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Recordatorios del día antes (SPEC 19). Lo llama Vercel Cron una vez al día. */
export async function GET(request: Request) {
  // Sin secreto configurado el endpoint queda cerrado, nunca abierto.
  if (!env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET no configurada" }, { status: 503 });
  if (!authorized(request.headers.get("authorization"), env.CRON_SECRET)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!env.RESEND_API_KEY) return NextResponse.json({ sent: 0, failed: 0, skipped: 0, reason: "sin RESEND_API_KEY" });

  const result = await new SendRemindersUseCase(
    new DrizzleBookingRepository(),
    new DrizzleProfessionalRepository(),
    new DrizzleUserRepository(),
    new DrizzleBrandingRepository(),
    new DrizzleServicesRepository(),
    new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM_ADDRESS ?? "onboarding@resend.dev"),
    new DrizzleEmailNotificationRepository(),
  ).execute({ baseUrl: env.AUTH_URL.replace(/\/$/, "") });

  return NextResponse.json(result);
}
