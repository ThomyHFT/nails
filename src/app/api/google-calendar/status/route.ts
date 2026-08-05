import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { env } from "@/server/infrastructure/config/env";
import { AesTokenCipher } from "@/server/infrastructure/security/aes-token-cipher";
import { DrizzleGoogleCalendarConnectionRepository } from "@/server/infrastructure/repositories/drizzle-google-calendar-connection.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "professional") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!env.GOOGLE_CLIENT_ID || !env.CALENDAR_TOKEN_KEY) {
    return NextResponse.json({ configured: false, connection: null });
  }

  const professional = await new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id);
  if (!professional) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const cipher = new AesTokenCipher(Buffer.from(env.CALENDAR_TOKEN_KEY, "base64"));
  const connection = await new DrizzleGoogleCalendarConnectionRepository(cipher).findByProfessionalId(professional.id);

  return NextResponse.json({
    configured: true,
    connection: connection
      ? {
          googleAccountEmail: connection.googleAccountEmail,
          status: connection.status,
          connectedAt: connection.connectedAt,
        }
      : null,
  });
}
