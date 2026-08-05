import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { env } from "@/server/infrastructure/config/env";
import { AesTokenCipher } from "@/server/infrastructure/security/aes-token-cipher";
import { GoogleCalendarGateway } from "@/server/infrastructure/calendar/google-calendar-gateway";
import { DrizzleGoogleCalendarConnectionRepository } from "@/server/infrastructure/repositories/drizzle-google-calendar-connection.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import { SyncBookingToCalendarUseCase } from "@/server/application/calendar/sync-booking-to-calendar.use-case";
import { BackfillCalendarUseCase } from "@/server/application/calendar/backfill-calendar.use-case";

const OAUTH_STATE_COOKIE = "google_calendar_oauth_state";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function decodeEmailFromIdToken(idToken: string): string | null {
  try {
    const payload = idToken.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: string };
    return decoded.email ?? null;
  } catch {
    return null;
  }
}

function withClearedStateCookie(response: NextResponse): NextResponse {
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "professional") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const professional = await new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id);
  if (!professional) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const adminUrl = new URL(`/${professional.slug}/admin/disponibilidad`, request.url);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !returnedState || !savedState || returnedState !== savedState) {
    adminUrl.searchParams.set("google_calendar", "state_mismatch");
    return withClearedStateCookie(NextResponse.redirect(adminUrl));
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.CALENDAR_TOKEN_KEY) {
    adminUrl.searchParams.set("google_calendar", "not_configured");
    return withClearedStateCookie(NextResponse.redirect(adminUrl));
  }

  const redirectUri = `${env.AUTH_URL}/api/google-calendar/callback`;

  const tokenResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    adminUrl.searchParams.set("google_calendar", "error");
    return withClearedStateCookie(NextResponse.redirect(adminUrl));
  }

  const tokenData = (await tokenResponse.json()) as { refresh_token?: string; id_token?: string };
  if (!tokenData.refresh_token) {
    adminUrl.searchParams.set("google_calendar", "no_refresh_token");
    return withClearedStateCookie(NextResponse.redirect(adminUrl));
  }

  const googleAccountEmail = tokenData.id_token ? decodeEmailFromIdToken(tokenData.id_token) : null;

  const cipher = new AesTokenCipher(Buffer.from(env.CALENDAR_TOKEN_KEY, "base64"));
  const connectionRepository = new DrizzleGoogleCalendarConnectionRepository(cipher);
  await connectionRepository.upsert({
    professionalId: professional.id,
    googleAccountEmail: googleAccountEmail ?? "Cuenta de Google",
    refreshToken: tokenData.refresh_token,
  });

  adminUrl.searchParams.set("google_calendar", "connected");

  try {
    const bookingRepository = new DrizzleBookingRepository();
    const syncUseCase = new SyncBookingToCalendarUseCase(
      bookingRepository,
      connectionRepository,
      new GoogleCalendarGateway(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET),
      new DrizzleUserRepository(),
      new DrizzleServicesRepository(),
    );
    const backfillUseCase = new BackfillCalendarUseCase(bookingRepository, syncUseCase);
    const result = await backfillUseCase.execute(professional.id);
    adminUrl.searchParams.set("synced", String(result.synced));
    adminUrl.searchParams.set("attempted", String(result.attempted));
  } catch {
    // Que el backfill falle no puede hacer que la conexión no quede guardada.
  }

  return withClearedStateCookie(NextResponse.redirect(adminUrl));
}
