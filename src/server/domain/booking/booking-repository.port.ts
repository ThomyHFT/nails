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
  serviceVariantId: string;
  designId?: string | null;
  startsAt: Date;
  endsAt: Date;
  priceClp: number;
  durationMinutes: number;
  clientNote?: string | null;
  /** Por defecto `pending` (la clienta reserva y la profesional confirma). Una reserva manual nace `confirmed`. */
  status?: "pending" | "confirmed";
}

export interface NewBookingWithDesign {
  professionalId: string;
  clientUserId: string;
  serviceVariantId: string;
  startsAt: Date;
  endsAt: Date;
  priceClp: number;
  durationMinutes: number;
  clientNote?: string | null;
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
  listByProfessional(professionalId: string, status?: BookingStatus): Promise<Booking[]>;
  listByClient(clientUserId: string): Promise<Booking[]>;
  /**
   * Cambia el estado solo si la reserva sigue en uno de `fromStatuses`
   * (escritura condicional). Devuelve `null` si no estaba en ninguno: otra
   * escritura ganó la carrera.
   */
  updateStatus(id: string, status: BookingStatus, fromStatuses: readonly BookingStatus[]): Promise<Booking | null>;
  /** Igual que `updateStatus`: `null` si la reserva ya no estaba en `fromStatuses`. */
  cancel(id: string, cancelledBy: BookingActor, fromStatuses: readonly BookingStatus[]): Promise<Booking | null>;
  setGoogleEventId(id: string, googleEventId: string | null): Promise<void>;
  /** Confirmadas, futuras, sin evento en Google — lo que un backfill tiene que subir. */
  listConfirmedFutureWithoutCalendarEvent(professionalId: string, now: Date): Promise<Booking[]>;
  countClientStrikes(professionalId: string, clientUserId: string): Promise<number>;
  /** Una fila por clienta con reservas en este tenant, ordenada por la más reciente primero. */
  listClientStats(professionalId: string): Promise<ClientBookingStats[]>;
  /** Reservas `pending`: el badge de "Reservas" en el nav, mismo criterio que el de Opiniones. */
  countPending(professionalId: string): Promise<number>;
}
