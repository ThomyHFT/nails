import { NextResponse } from "next/server";
import { ListDesignElementsUseCase } from "@/server/application/design/list-design-elements.use-case";
import { DrizzleDesignRepository } from "@/server/infrastructure/repositories/drizzle-design.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "slug es requerido" }, { status: 400 });
  }

  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  if (!professional) {
    return NextResponse.json({ error: "Profesional no encontrada" }, { status: 404 });
  }

  const elements = await new ListDesignElementsUseCase(new DrizzleDesignRepository()).execute(professional.id, {
    onlyActive: true,
  });
  return NextResponse.json({ elements });
}
