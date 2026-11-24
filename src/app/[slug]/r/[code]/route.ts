import { NextResponse } from "next/server";
import { GetProfessionalBySlugUseCase } from "@/server/application/tenant/get-professional-by-slug.use-case";
import { resolveShortCode } from "@/server/domain/tenant/short-link";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";

/**
 * Link corto a reservar un servicio (SPEC 21). Un código desconocido o un
 * servicio inactivo lleva a la reserva sin servicio: el link impreso en un QR
 * no debe romperse porque la profesional cambió su catálogo.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string; code: string }> }) {
  const { slug, code } = await params;
  const target = new URL(`/${encodeURIComponent(slug)}/reservar`, request.url);

  const professional = await new GetProfessionalBySlugUseCase(new DrizzleProfessionalRepository()).execute(slug);
  if (professional) {
    const services = (await new DrizzleServicesRepository().listByProfessional(professional.id)).filter((s) => s.active);
    const service = resolveShortCode(code, services);
    if (service) target.searchParams.set("service", service.id);
  }

  // 307: el destino depende del catálogo de hoy, no se debe cachear para siempre.
  return NextResponse.redirect(target, 307);
}
