import { notFound, redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

export async function requireProfessional(slug: string): Promise<Session> {
  const session = await auth();

  if (!session) {
    redirect(`/${slug}/login`);
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
