/**
 * Agregado de reservas por clienta, para /admin/clientes. No lleva nombre ni
 * correo: eso es de `users`, y cruzarlo es responsabilidad de quien arma la
 * pantalla, no del repositorio de reservas (SPEC 16).
 */
export interface ClientBookingStats {
  clientUserId: string;
  totalBookings: number;
  /** Solo reservas `completed`: `price_clp` es la foto congelada al reservar, y sumar canceladas infla el número con plata que nunca se cobró. */
  completedBookings: number;
  totalSpentClp: number;
  lastBookingAt: Date;
  /** Mismo criterio que `countClientStrikes`: cancelaciones hechas por la clienta. */
  strikes: number;
}
