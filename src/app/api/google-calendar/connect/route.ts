import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CryptoTokenGenerator } from "@/server/infrastructure/security/crypto-token-generator";
import { env } from "@/server/infrastructure/config/env";

const OAUTH_STATE_COOKIE = "google_calendar_oauth_state";
const SCOPE = "openid email https://www.googleapis.com/auth/calendar.events";

export async function GET(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "professional") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!env.GOOGLE_CLIENT_ID) {
    return NextResponse.json({ error: "Google Calendar no está configurado" }, { status: 501 });
  }

  const state = new CryptoTokenGenerator().generateToken();
  const redirectUri = `${env.AUTH_URL}/api/google-calendar/callback`;

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
