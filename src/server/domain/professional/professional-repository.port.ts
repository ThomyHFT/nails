import type { Professional } from "@/server/domain/professional/professional.entity";

export interface ContactInfoInput {
  phone: string | null;
  phoneVisible: boolean;
  address: string | null;
  addressVisible: boolean;
}

export interface ProfessionalRepository {
  findById(id: string): Promise<Professional | null>;
  findBySlug(slug: string): Promise<Professional | null>;
  findByOwnerUserId(ownerUserId: string): Promise<Professional | null>;
  updateBufferMinutes(professionalId: string, bufferMinutes: number): Promise<Professional>;
  updateTagline(professionalId: string, tagline: string | null): Promise<Professional>;
  updateContactInfo(professionalId: string, input: ContactInfoInput): Promise<Professional>;
  /** Setea `publishedAt` a ahora. Es lo que verificar el correo desbloquea. */
  markPublished(professionalId: string): Promise<Professional>;
}
