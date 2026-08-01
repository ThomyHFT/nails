import type { Professional } from "@/server/domain/professional/professional.entity";

export interface ProfessionalRepository {
  findById(id: string): Promise<Professional | null>;
  findBySlug(slug: string): Promise<Professional | null>;
  findByOwnerUserId(ownerUserId: string): Promise<Professional | null>;
  updateBufferMinutes(professionalId: string, bufferMinutes: number): Promise<Professional>;
}
