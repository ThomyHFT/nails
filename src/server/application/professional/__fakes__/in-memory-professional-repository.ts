import type { Plan } from "@/server/domain/staff/staff-member";
import type { ProfessionalCommerce } from "@/server/domain/professional/commerce";
import type { BookingPolicy } from "@/server/domain/professional/booking-policy";
import type { ContactInfoInput, ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
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

  async updateBookingPolicy(professionalId: string, policy: BookingPolicy): Promise<Professional> {
    const professional = this.professionals.find((p) => p.id === professionalId);
    if (!professional) throw new Error(`Professional ${professionalId} not found`);
    professional.bookingPolicy = { ...policy };
    return professional;
  }

  async updateCommerce(professionalId: string, commerce: ProfessionalCommerce): Promise<Professional> {
    const professional = this.professionals.find((p) => p.id === professionalId);
    if (!professional) throw new Error(`Professional ${professionalId} not found`);
    professional.commerce = { ...commerce };
    return professional;
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

  async updateContactInfo(professionalId: string, input: ContactInfoInput): Promise<Professional> {
    const professional = this.professionals.find((p) => p.id === professionalId);
    if (!professional) throw new Error("Profesional no encontrada");
    Object.assign(professional, input);
    return professional;
  }

  async markPublished(professionalId: string): Promise<Professional> {
    const professional = this.professionals.find((p) => p.id === professionalId);
    if (!professional) throw new Error("Profesional no encontrada");
    professional.publishedAt = new Date();
    return professional;
  }

  async findAll(): Promise<Professional[]> {
    return [...this.professionals];
  }

  async setActive(professionalId: string, active: boolean): Promise<Professional> {
    const professional = this.professionals.find((p) => p.id === professionalId);
    if (!professional) throw new Error("Profesional no encontrada");
    professional.active = active;
    return professional;
  }

  async updatePlan(professionalId: string, plan: Plan, staffLimit: number): Promise<Professional> {
    const professional = this.professionals.find((p) => p.id === professionalId);
    if (!professional) throw new Error(`Professional ${professionalId} not found`);
    professional.plan = plan;
    professional.staffLimit = staffLimit;
    return professional;
  }

  async setTrialEndsAt(professionalId: string, trialEndsAt: Date | null): Promise<Professional> {
    const professional = this.professionals.find((p) => p.id === professionalId);
    if (!professional) throw new Error("Profesional no encontrada");
    professional.trialEndsAt = trialEndsAt;
    return professional;
  }
}
