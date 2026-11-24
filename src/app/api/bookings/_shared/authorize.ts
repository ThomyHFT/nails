import { NextResponse } from "next/server";
import type { Professional } from "@/server/domain/professional/professional.entity";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { canManageBooking, getBookingManager } from "@/server/interface/staff-context";

/**
 * Quién puede confirmar, completar, marcar no asistió o cancelar una reserva
 * desde un panel (SPEC 22): la dueña, cualquiera de su negocio; una
 * integrante, solo las suyas. Devuelve el negocio con el que sigue el caso de
 * uso, o la respuesta de error.
 */
export async function authorizeBookingAction(
  bookingId: string,
): Promise<{ professional: Professional; response: null } | { professional: null; response: NextResponse }> {
  const manager = await getBookingManager();
  if (!manager) {
    return { professional: null, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  if (manager.kind === "staff") {
    const booking = await new DrizzleBookingRepository().findById(bookingId);
    // 404 y no 403: una integrante no tiene por qué saber qué reservas existen fuera de su agenda.
    if (!booking || !canManageBooking(manager, booking)) {
      return { professional: null, response: NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 }) };
    }
  }
  return { professional: manager.professional, response: null };
}
