import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { env } from "@/server/infrastructure/config/env";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

export async function middleware(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/([^/]+)\/admin(\/.*)?$/);

  if (!match) {
    return NextResponse.next();
  }

  const slug = match[1];
  const token = await getToken({ req: request, secret: env.AUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(new URL(`/${slug}/login`, request.url));
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
