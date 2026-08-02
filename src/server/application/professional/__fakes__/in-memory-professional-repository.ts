import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import type { Professional } from "@/server/domain/professional/professional.entity";

export class InMemoryProfessionalRepository implements ProfessionalRepository {
  readonly professionals: Professional[] = [];

  async findById(id: string): Promise<Professional | null> {
    return this.professionals.find((p) => p.id === id) ?? null;
  }

  async findBySlug(slug: string): Promise<Professional | null> {
    return this.professionals.find((p) => p.slug === slug) ?? null;
  }

  async findByOwnerUserId(ownerUserId: string): Promise<Professional | null> {
    return this.professionals.find((p) => p.ownerUserId === ownerUserId) ?? null;
  }

  async updateBufferMinutes(professionalId: string, bufferMinutes: number): Promise<Professional> {
    const professional = this.professionals.find((p) => p.id === professionalId);
    if (!professional) throw new Error("Profesional no encontrada");
    professional.bufferMinutes = bufferMinutes;
    return professional;
  }

  async updateTagline(professionalId: string, tagline: string | null): Promise<Professional> {
    const professional = this.professionals.find((p) => p.id === professionalId);
    if (!professional) throw new Error("Profesional no encontrada");
    professional.tagline = tagline;
    return professional;
  }
}
