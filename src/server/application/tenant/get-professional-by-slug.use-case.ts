import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import { isPubliclyVisible, type Professional } from "@/server/domain/professional/professional.entity";

/**
 * Resuelve el tenant de las páginas públicas. Es el único punto por donde
 * pasan todas, así que acá se aplica la visibilidad (corte manual,
 * verificación de correo pendiente, prueba vencida).
 *
 * `requireTenantOwner` deliberadamente no usa este caso de uso: la
 * profesional tiene que poder entrar a su panel aunque su sitio no esté
 * publicado, que es justo lo que hace mientras lo configura.
 */
export class GetProfessionalBySlugUseCase {
  constructor(private readonly professionalRepository: ProfessionalRepository) {}

  async execute(slug: string): Promise<Professional | null> {
    const professional = await this.professionalRepository.findBySlug(slug);

    if (!professional || !isPubliclyVisible(professional)) {
      return null;
    }

    return professional;
  }
}
