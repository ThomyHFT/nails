import type { Session } from "next-auth";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

/**
 * A dónde va alguien que inició sesión desde `/ingresar`, la puerta de entrada
 * que no exige saber el slug. La profesional vuelve a su panel sin tener que
 * recordar su dirección; el superadmin, al suyo.
 *
 * Una clienta no tiene una casa propia fuera de los micrositios (sus reservas
 * viven bajo el slug de cada profesional), así que vuelve a la portada.
 */
export async function homePathForSession(session: Session): Promise<string> {
  if (session.user.role === "admin") return "/admin";

  if (session.user.role === "professional") {
    const professional = await new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id);
    if (professional) return `/${professional.slug}/admin`;
  }

  return "/";
}
