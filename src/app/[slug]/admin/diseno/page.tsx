import { notFound } from "next/navigation";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { verticalModules } from "@/server/domain/tenant/vertical";
import { DisenoClient } from "@/app/[slug]/admin/diseno/DisenoClient";

/**
 * El guard de acceso al panel ya corrió en el layout. Acá se corta solo por
 * rubro: esconder el link de la navegación no basta, la ruta tiene que dar
 * 404 aunque se escriba a mano (ver SPEC 13).
 */
export default async function DisenoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  if (!professional || !verticalModules(professional.vertical).designer) {
    notFound();
  }

  return <DisenoClient />;
}
