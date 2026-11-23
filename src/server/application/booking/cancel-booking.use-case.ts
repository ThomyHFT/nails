import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { Booking } from "@/server/domain/booking/booking.entity";
import { allowedFromStatuses, canApplyBookingAction } from "@/server/domain/booking/booking-transitions";
import { isWithinClientChangeWindow } from "@/server/domain/professional/booking-policy";
import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import {
  BookingInvalidStateError,
  BookingNotFoundError,
  BookingNotOwnedError,
  ClientChangeWindowClosedError,
} from "@/server/application/booking/booking-guard-errors";

/**
 * La clienta solo puede cancelar o reagendar dentro del plazo que fijó la
 * profesional (SPEC 19). Pasado el plazo, tiene que hablar con ella.
 */
export async function assertClientChangeAllowed(
  professionalRepository: ProfessionalRepository | undefined,
  booking: Booking,
  now: Date,
): Promise<void> {
  if (!professionalRepository) return;
  const professional = await professionalRepository.findById(booking.professionalId);
  if (professional && !isWithinClientChangeWindow(professional.bookingPolicy, booking.startsAt, now)) {
    throw new ClientChangeWindowClosedError(professional.bookingPolicy.cancellationDeadlineHours);
  }
}

export class CancelBookingByClientUseCase {
  constructor(
    private readonly bookingRepository: BookingRepository,
    // Opcional para no romper los usos que no aplican plazo; las rutas
    // siempre lo pasan (SPEC 19).
    private readonly professionalRepository?: ProfessionalRepository,
  ) {}

  async execute(bookingId: string, clientUserId: string, now: Date = new Date()): Promise<Booking> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new BookingNotFoundError();
    if (booking.clientUserId !== clientUserId) throw new BookingNotOwnedError();
    if (!canApplyBookingAction(booking.status, "cancel")) throw new BookingInvalidStateError();
    await assertClientChangeAllowed(this.professionalRepository, booking, now);

    const updated = await this.bookingRepository.cancel(bookingId, "client", allowedFromStatuses("cancel"));
    // null: la reserva cambió entre la lectura y esta escritura.
    if (!updated) throw new BookingInvalidStateError();
    return updated;
  }
}

/** Rechazar una pendiente o cancelar una confirmada son la misma acción vista desde la profesional. */
export class CancelBookingByProfessionalUseCase {
  constructor(private readonly bookingRepository: BookingRepository) {}

  async execute(bookingId: string, professionalId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new BookingNotFoundError();
    if (booking.professionalId !== professionalId) throw new BookingNotOwnedError();
    if (!canApplyBookingAction(booking.status, "cancel")) throw new BookingInvalidStateError();

    const updated = await this.bookingRepository.cancel(bookingId, "professional", allowedFromStatuses("cancel"));
    // null: la reserva cambió entre la lectura y esta escritura.
    if (!updated) throw new BookingInvalidStateError();
    return updated;
  }
}
