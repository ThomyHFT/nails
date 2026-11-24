import type { Professional } from "@/server/domain/professional/professional.entity";
import type { StaffMember } from "@/server/domain/staff/staff-member";

/**
 * Quién maneja reservas desde un panel (SPEC 22): la dueña, todas las de su
 * negocio; una integrante, solo las suyas.
 */
export type BookingManager =
  | { kind: "owner"; professional: Professional }
  | { kind: "staff"; professional: Professional; staff: StaffMember };

export function canManageBooking(manager: BookingManager, booking: { professionalId: string; staffId: string }): boolean {
  if (booking.professionalId !== manager.professional.id) return false;
  return manager.kind === "owner" || booking.staffId === manager.staff.id;
}
