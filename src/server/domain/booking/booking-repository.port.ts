import type { Booking, BookingActor, BookingStatus } from "@/server/domain/booking/booking.entity";
import type { ClientBookingStats } from "@/server/domain/booking/client-booking-stats.entity";
import type { NailDesignPayload } from "@/server/domain/design/nail-design-payload";

/**
 * El repositorio la lanza cuando la base rechaza la reserva por solaparse con
 * otra activa de la misma profesional (constraint `bookings_no_overlap`). Es la
 * red de seguridad para dos reservas simultáneas que pasaron el cálculo de
 * slots antes de que la otra quedara guardada.
 */
export class BookingSlotTakenError extends Error {
  constructor() {
    super("El horario ya fue tomado por otra reserva");
    this.name = "BookingSlotTakenError";
  }
}

export interface NewBooking {
  professionalId: string;
  clientUserId: string;
  /** Quién atiende (SPEC 22). */
  staffId: string;
  serviceVariantId: string;
  designId?: string | null;
  startsAt: Date;
  endsAt: Date;
  priceClp: number;
  durationMinutes: number;
  clientNote?: string | null;
  /** Abono congelado (SPEC 21). */
  depositClp?: number | null;
  /** Por defecto `pending` (la clienta reserva y la profesional confirma). Una reserva manual nace `confirmed`. */
  status?: "pending" | "confirmed";
}

export interface NewBookingWithDesign {
  professionalId: string;
  clientUserId: string;
  staffId: string;
  serviceVariantId: string;
  startsAt: Date;
  endsAt: Date;
  priceClp: number;
  durationMinutes: number;
  clientNote?: string | null;
  depositClp?: number | null;
  status?: "pending" | "confirmed";
  design: {
    payload: NailDesignPayload;
    extraPriceClp: number;
    extraMinutes: number;
    referenceImageUrl?: string | null;
  };
}

export interface BookingRepository {
  create(booking: NewBooking): Promise<Booking>;
  createWithDesign(booking: NewBookingWithDesign): Promise<Booking>;
  findById(id: string): Promise<Booking | null>;
  listActiveByProfessionalInRange(professionalId: string, rangeStart: Date, rangeEnd: Date): Promise<Booking[]>;
  /** Activas de una integrante que se cruzan con el rango: lo que ocupa su agenda (SPEC 22). */
  listActiveByStaffInRange(staffId: string, rangeStart: Date, rangeEnd: Date): Promise<Booking[]>;
  /** Reservas de una integrante, la más reciente primero (panel de equipo, SPEC 22). */
  listByStaff(staffId: string): Promise<Booking[]>;
  /**
   * Pasa la reserva a otra integrante si sigue en `fromStatuses`; `null` si no.
   * Lanza BookingSlotTakenError si la otra ya tiene una reserva a esa hora.
   */
  reassign(id: string, staffId: string, fromStatuses: readonly BookingStatus[]): Promise<Booking | null>;
  listByProfessional(professionalId: string, status?: BookingStatus): Promise<Booking[]>;
  listByClient(clientUserId: string): Promise<Booking[]>;
  /** Historial de una clienta con un negocio (ficha de clienta, SPEC 20). */
  listByProfessionalAndClient(professionalId: string, clientUserId: string): Promise<Booking[]>;
  /**
   * Cambia el estado solo si la reserva sigue en uno de `fromStatuses`
   * (escritura condicional). Devuelve `null` si no estaba en ninguno: otra
   * escritura ganó la carrera.
   */
  updateStatus(id: string, status: BookingStatus, fromStatuses: readonly BookingStatus[]): Promise<Booking | null>;
  /**
   * Mueve la reserva (SPEC 19) solo si sigue en `fromStatuses`; `null` si no.
   * Limpia el recordatorio enviado. Lanza BookingSlotTakenError si la nueva
   * hora se solapa con otra reserva activa.
   */
  reschedule(
    id: string,
    startsAt: Date,
    endsAt: Date,
    fromStatuses: readonly BookingStatus[],
  ): Promise<Booking | null>;
  /** Igual que `updateStatus`: `null` si la reserva ya no estaba en `fromStatuses`. */
  cancel(id: string, cancelledBy: BookingActor, fromStatuses: readonly BookingStatus[]): Promise<Booking | null>;
  /**
   * Marca el abono como recibido (SPEC 21) si la reserva lo tiene, no estaba
   * marcado y sigue pendiente o confirmada. `null` si no correspondía.
   */
  markDepositPaid(id: string): Promise<Booking | null>;
  /** Completadas que empezaron en [from, to) sin correo "vuelve a reservar" (SPEC 21). */
  listCompletedAwaitingRebook(from: Date, to: Date): Promise<Booking[]>;
  /** Igual que `claimReminder`, para el correo "vuelve a reservar". */
  claimRebook(id: string): Promise<boolean>;
  setGoogleEventId(id: string, googleEventId: string | null): Promise<void>;
  /** Confirmadas que empiezan en [from, to) y todavía no tienen recordatorio (SPEC 19). */
  listAwaitingReminder(from: Date, to: Date): Promise<Booking[]>;
  /**
   * Marca el recordatorio como enviado solo si nadie lo marcó antes. `true` si
   * esta llamada lo tomó: dos corridas del cron no mandan dos correos.
   */
  claimReminder(id: string): Promise<boolean>;
  /** Confirmadas, futuras, sin evento en Google — lo que un backfill tiene que subir. */
  listConfirmedFutureWithoutCalendarEvent(professionalId: string, now: Date): Promise<Booking[]>;
  countClientStrikes(professionalId: string, clientUserId: string): Promise<number>;
  /** Una fila por clienta con reservas en este tenant, ordenada por la más reciente primero. */
  listClientStats(professionalId: string): Promise<ClientBookingStats[]>;
  /** Reservas `pending`: el badge de "Reservas" en el nav, mismo criterio que el de Opiniones. */
  countPending(professionalId: string): Promise<number>;
}
