import { auth } from "@/auth";
import type { Professional } from "@/server/domain/professional/professional.entity";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

/** El negocio de la profesional con sesión, o `null` si quien llama no es una profesional. */
export async function getSessionProfessional(): Promise<Professional | null> {
  const session = await auth();
  if (!session || session.user.role !== "professional") return null;
  return new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id);
}
