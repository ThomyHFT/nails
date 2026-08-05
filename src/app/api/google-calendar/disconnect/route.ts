import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { env } from "@/server/infrastructure/config/env";
import { AesTokenCipher } from "@/server/infrastructure/security/aes-token-cipher";
import { DrizzleGoogleCalendarConnectionRepository } from "@/server/infrastructure/repositories/drizzle-google-calendar-connection.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "professional") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const professional = await new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id);
  if (!professional) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!env.CALENDAR_TOKEN_KEY) {
    return NextResponse.json({ error: "Google Calendar no está configurado" }, { status: 501 });
  }

  const cipher = new AesTokenCipher(Buffer.from(env.CALENDAR_TOKEN_KEY, "base64"));
  await new DrizzleGoogleCalendarConnectionRepository(cipher).delete(professional.id);

  return NextResponse.json({ ok: true });
}
