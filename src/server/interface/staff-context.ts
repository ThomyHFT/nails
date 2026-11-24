import { auth } from "@/auth";
import type { Professional } from "@/server/domain/professional/professional.entity";
import type { StaffMember } from "@/server/domain/staff/staff-member";
import type { BookingManager } from "@/server/domain/staff/booking-manager";

export { canManageBooking, type BookingManager } from "@/server/domain/staff/booking-manager";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleStaffRepository } from "@/server/infrastructure/repositories/drizzle-staff.repository";

/**
 * La integrante cuya agenda edita la dueña (SPEC 22): la pedida si es de su
 * negocio, o ella misma si no pide ninguna. `null` si el id no es de este
 * negocio: nunca se cae en silencio a la dueña con un id ajeno.
 */
export async function staffForOwner(professional: Professional, staffId?: string | null): Promise<StaffMember | null> {
  const repository = new DrizzleStaffRepository();
  return staffId ? repository.findById(staffId, professional.id) : repository.findOwner(professional.id);
}

export interface StaffSession {
  professional: Professional;
  staff: StaffMember;
}

/**
 * La integrante con sesión (rol `staff`) y su negocio, o `null`. Una
 * integrante desactivada pierde el acceso aunque su sesión siga viva.
 */
export async function getSessionStaff(): Promise<StaffSession | null> {
  const session = await auth();
  if (!session || session.user.role !== "staff") return null;
  const staff = await new DrizzleStaffRepository().findByUserId(session.user.id);
  if (!staff || !staff.active) return null;
  const professional = await new DrizzleProfessionalRepository().findById(staff.professionalId);
  if (!professional || professional.plan !== "salon") return null;
  return { professional, staff };
}

export async function getBookingManager(): Promise<BookingManager | null> {
  const session = await auth();
  if (!session) return null;
  if (session.user.role === "professional") {
    const professional = await new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id);
    return professional ? { kind: "owner", professional } : null;
  }
  const staffSession = await getSessionStaff();
  return staffSession ? { kind: "staff", ...staffSession } : null;
}
