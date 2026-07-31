import type { Professional } from "@/server/domain/professional/professional.entity";

export interface ProfessionalRepository {
  findBySlug(slug: string): Promise<Professional | null>;
  findByOwnerUserId(ownerUserId: string): Promise<Professional | null>;
  updateBufferMinutes(professionalId: string, bufferMinutes: number): Promise<Professional>;
}
