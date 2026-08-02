import { NextResponse } from "next/server";
import { validateSlug } from "@/server/domain/tenant/reserved-slugs";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") ?? "").trim().toLowerCase();

  if (!slug) {
    return NextResponse.json({ available: false, reason: "invalid_format" });
  }

  const validity = validateSlug(slug);
  if (validity !== "ok") {
    // Mismo motivo hacia afuera para reservado y mal formado: la lista de
    // reservados no le sirve a quien está escribiendo.
    return NextResponse.json({ available: false, reason: validity === "reserved" ? "taken" : "invalid_format" });
  }

  const existing = await new DrizzleProfessionalRepository().findBySlug(slug);
  return NextResponse.json({ available: !existing, reason: existing ? "taken" : null });
}
