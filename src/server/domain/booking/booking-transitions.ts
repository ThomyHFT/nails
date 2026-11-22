import type { BookingStatus } from "@/server/domain/booking/booking.entity";

export type BookingAction = "confirm" | "cancel" | "complete" | "no_show";

/**
 * Desde qué estados se puede aplicar cada acción. Una reserva cancelada,
 * completada o no_show es terminal: volver a tocarla revive un horario que
 * otra clienta pudo haber tomado, borra strikes o inventa visitas.
 *
 * Es la misma regla que ya aplicaba la UI de /admin/reservas; vive acá para
 * que la API la haga cumplir aunque la vista esté desactualizada.
 */
const ALLOWED_FROM: Record<BookingAction, readonly BookingStatus[]> = {
  confirm: ["pending"],
  cancel: ["pending", "confirmed"],
  complete: ["pending", "confirmed"],
  no_show: ["pending", "confirmed"],
};

export function canApplyBookingAction(status: BookingStatus, action: BookingAction): boolean {
  return ALLOWED_FROM[action].includes(status);
}
