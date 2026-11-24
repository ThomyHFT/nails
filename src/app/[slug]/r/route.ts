import { NextResponse } from "next/server";

/** Link corto para la bio de Instagram y el botón "Reservar" de Google (SPEC 21). */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return NextResponse.redirect(new URL(`/${encodeURIComponent(slug)}/reservar`, request.url), 308);
}
