import { normalizeEmail } from "@/server/domain/auth/email-code";
import { BookingSlotTakenError, type BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { Booking } from "@/server/domain/booking/booking.entity";
import type { Professional } from "@/server/domain/professional/professional.entity";
import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import type { ServicesRepository } from "@/server/domain/service/services-repository.port";
import {
  MAX_STAFF_NAME,
  SALON_MAX_STAFF,
  SALON_MIN_STAFF,
  doesService,
  type Plan,
  type StaffMember,
  type StaffRepository,
} from "@/server/domain/staff/staff-member";
import { UNUSABLE_PASSWORD_HASH } from "@/server/domain/user/client-contact";
import type { UserRepository } from "@/server/domain/user/user-repository.port";

export class TeamError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409 | 422 = 422,
  ) {
    super(message);
    this.name = "TeamError";
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Plan del negocio (SPEC 22). Lo usa solo el superadmin. */
export class SetPlanUseCase {
  constructor(
    private readonly professionals: ProfessionalRepository,
    private readonly staff: StaffRepository,
  ) {}

  async execute(professionalId: string, plan: Plan, requestedLimit: number): Promise<Professional> {
    const professional = await this.professionals.findById(professionalId);
    if (!professional) throw new TeamError("Negocio no encontrado", 404);
    const staffLimit = plan === "solo" ? 1 : requestedLimit;
    if (plan === "salon" && (!Number.isInteger(staffLimit) || staffLimit < SALON_MIN_STAFF || staffLimit > SALON_MAX_STAFF)) {
      throw new TeamError(`El Plan Salón va de ${SALON_MIN_STAFF} a ${SALON_MAX_STAFF} integrantes`);
    }

    // Bajar el tope deja activas a la dueña y a las primeras del equipo; las
    // demás quedan inactivas sin borrar nada (sus reservas siguen en pie).
    const team = await this.staff.listByProfessional(professionalId);
    const keep = new Set(
      [...team.filter((s) => s.isOwner), ...team.filter((s) => !s.isOwner && s.active)].slice(0, staffLimit).map((s) => s.id),
    );
    for (const member of team) {
      if (member.active && !keep.has(member.id)) await this.staff.update(member.id, professionalId, { active: false });
    }
    return this.professionals.updatePlan(professionalId, plan, staffLimit);
  }
}

/** Lo que la dueña hace con su equipo en /admin/equipo (SPEC 22). */
export class TeamUseCase {
  constructor(
    private readonly staff: StaffRepository,
    private readonly users: UserRepository,
    private readonly services: ServicesRepository,
  ) {}

  private requireSalon(professional: Professional) {
    if (professional.plan !== "salon") throw new TeamError("Tu plan no incluye equipo", 409);
  }

  private async requireMember(professional: Professional, staffId: string): Promise<StaffMember> {
    const member = await this.staff.findById(staffId, professional.id);
    if (!member) throw new TeamError("Integrante no encontrada", 404);
    return member;
  }

  private async assertRoom(professional: Professional) {
    const active = (await this.staff.listByProfessional(professional.id)).filter((s) => s.active).length;
    if (active >= professional.staffLimit) {
      throw new TeamError(`Tu plan permite ${professional.staffLimit} integrantes activas`, 409);
    }
  }

  /** Usuario `staff` sin contraseña: entra con el código por correo y crea la suya en su cuenta. */
  private async createAccess(email: string, name: string): Promise<string> {
    const normalized = normalizeEmail(email);
    if (!EMAIL.test(normalized)) throw new TeamError("Correo inválido");
    if (await this.users.findByEmail(normalized)) {
      throw new TeamError("Ese correo ya tiene una cuenta. Usa otro para tu integrante.", 409);
    }
    const user = await this.users.create({ email: normalized, passwordHash: UNUSABLE_PASSWORD_HASH, name, role: "staff" });
    return user.id;
  }

  private cleanName(name: string): string {
    const clean = name.trim();
    if (clean.length < 2 || clean.length > MAX_STAFF_NAME) throw new TeamError(`El nombre va de 2 a ${MAX_STAFF_NAME} caracteres`);
    return clean;
  }

  async add(professional: Professional, input: { name: string; email?: string | null }): Promise<StaffMember> {
    this.requireSalon(professional);
    await this.assertRoom(professional);
    const name = this.cleanName(input.name);
    const userId = input.email ? await this.createAccess(input.email, name) : null;
    const team = await this.staff.listByProfessional(professional.id);
    return this.staff.create({
      professionalId: professional.id,
      name,
      userId,
      sortOrder: Math.max(0, ...team.map((s) => s.sortOrder)) + 1,
    });
  }

  async grantAccess(professional: Professional, staffId: string, email: string): Promise<StaffMember> {
    this.requireSalon(professional);
    const member = await this.requireMember(professional, staffId);
    if (member.isOwner) throw new TeamError("La dueña ya entra con su cuenta", 409);
    if (member.userId) throw new TeamError("Esta integrante ya tiene acceso", 409);
    const userId = await this.createAccess(email, member.name);
    return (await this.staff.update(member.id, professional.id, { userId }))!;
  }

  async update(
    professional: Professional,
    staffId: string,
    patch: { name?: string; active?: boolean; allServices?: boolean; serviceIds?: string[] },
  ): Promise<StaffMember> {
    const member = await this.requireMember(professional, staffId);
    if (patch.active === false && member.isOwner) throw new TeamError("La dueña no se puede desactivar", 409);
    if (patch.active === true && !member.active) {
      this.requireSalon(professional);
      await this.assertRoom(professional);
    }
    if (patch.serviceIds) {
      const own = new Set((await this.services.listByProfessional(professional.id)).map((s) => s.id));
      if (patch.serviceIds.some((id) => !own.has(id))) throw new TeamError("Servicio no encontrado", 404);
      await this.staff.setServices(member.id, patch.serviceIds);
    }
    return (await this.staff.update(member.id, professional.id, {
      name: patch.name === undefined ? undefined : this.cleanName(patch.name),
      active: patch.active,
      allServices: patch.allServices,
    }))!;
  }

  /** Pasa una reserva a otra integrante libre a esa hora y que haga el servicio. */
  async reassign(professional: Professional, bookings: BookingRepository, bookingId: string, staffId: string): Promise<Booking> {
    const booking = await bookings.findById(bookingId);
    if (!booking || booking.professionalId !== professional.id) throw new TeamError("Reserva no encontrada", 404);
    const target = await this.requireMember(professional, staffId);
    if (!target.active) throw new TeamError("Esa integrante está inactiva", 409);
    const variant = await this.services.findVariantById(booking.serviceVariantId, professional.id);
    if (variant && !doesService(target, variant.serviceId)) throw new TeamError("Esa integrante no hace este servicio", 409);
    if (booking.staffId === target.id) return booking;
    try {
      const updated = await bookings.reassign(booking.id, target.id, ["pending", "confirmed"]);
      if (!updated) throw new TeamError("Solo se reasignan reservas pendientes o confirmadas", 409);
      return updated;
    } catch (err) {
      if (err instanceof BookingSlotTakenError) throw new TeamError("Esa integrante ya tiene una reserva a esa hora", 409);
      throw err;
    }
  }
}
