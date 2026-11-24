import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { Booking } from "@/server/domain/booking/booking.entity";
import { BookingNotFoundError, BookingNotOwnedError } from "@/server/application/booking/booking-guard-errors";

export class DepositNotApplicableError extends Error {
  constructor() {
    super("Esta reserva no tiene un abono pendiente");
    this.name = "DepositNotApplicableError";
  }
}

export interface MarkDepositResult {
  booking: Booking;
  /** La reserva pasó de pendiente a confirmada: el llamador avisa y sincroniza el calendario. */
  confirmedNow: boolean;
}

/**
 * "Abono recibido" (SPEC 21). La profesional ve la transferencia en su banco
 * y la marca acá; si la reserva estaba pendiente, queda confirmada.
 */
export class MarkDepositReceivedUseCase {
  constructor(private readonly bookingRepository: BookingRepository) {}

  async execute(bookingId: string, professionalId: string): Promise<MarkDepositResult> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new BookingNotFoundError();
    if (booking.professionalId !== professionalId) throw new BookingNotOwnedError();

    const paid = await this.bookingRepository.markDepositPaid(bookingId);
    if (!paid) throw new DepositNotApplicableError();
    if (paid.status !== "pending") return { booking: paid, confirmedNow: false };

    const confirmed = await this.bookingRepository.updateStatus(bookingId, "confirmed", ["pending"]);
    // null: otra escritura la movió entre medio (la confirmaron o la cancelaron).
    return confirmed ? { booking: confirmed, confirmedNow: true } : { booking: paid, confirmedNow: false };
  }
}
