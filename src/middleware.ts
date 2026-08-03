import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { env } from "@/server/infrastructure/config/env";
import { isReservedSlug } from "@/server/domain/tenant/reserved-slugs";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

export async function middleware(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/([^/]+)\/admin(\/.*)?$/);

  // `/:slug/admin/:path*` también matchea `/api/admin/...`: "api" es una
  // ruta reservada, no un slug de tenant. Sin este corte, el panel de
  // superadmin quedaba redirigido a `/api/login`.
  if (!match || isReservedSlug(match[1])) {
    return NextResponse.next();
  }

  const slug = match[1];
  const secureCookie = request.nextUrl.protocol === "https:";
  const token = await getToken({ req: request, secret: env.AUTH_SECRET, secureCookie });

  if (!token) {
    // "next" apunta al panel: sin esto, loguearse desde acá dejaba a la
    // profesional sin ningún link de vuelta a /admin (guards.ts tiene el
    // mismo redirect para cuando el Server Component es el que corta, pero
    // este middleware corre antes y es el que de hecho se dispara para las
    // rutas /admin).
    const nextPath = `/${slug}/admin${match[2] ?? ""}`;
    const loginUrl = new URL(`/${slug}/login`, request.url);
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  if (token.role !== "professional") {
    return new NextResponse(null, { status: 404 });
  }

  const professionalRepository = new DrizzleProfessionalRepository();
  const professional = await professionalRepository.findBySlug(slug);

  if (!professional || professional.ownerUserId !== token.id) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:slug/admin/:path*"],
};
