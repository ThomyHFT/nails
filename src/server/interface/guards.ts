import { notFound, redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

export async function requireProfessional(slug: string): Promise<Session> {
  const session = await auth();

  if (!session) {
    // "next" apunta al panel, no a la sub-ruta exacta que se pidió: no hay
    // forma confiable de leer el pathname completo desde un Server Component
    // sin middleware, y volver al resumen es mejor que el callejón sin salida
    // de antes (loguearse y quedar sin ningún link hacia el panel).
    redirect(`/${slug}/login?next=${encodeURIComponent(`/${slug}/admin`)}`);
  }

  if (session.user.role !== "professional") {
    notFound();
  }

  return session;
}

export async function requireTenantOwner(slug: string): Promise<Session> {
  const session = await requireProfessional(slug);

  const professionalRepository = new DrizzleProfessionalRepository();
  const professional = await professionalRepository.findBySlug(slug);

  if (!professional || professional.ownerUserId !== session.user.id) {
    notFound();
  }

  return session;
}
