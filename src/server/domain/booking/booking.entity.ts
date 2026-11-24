export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type BookingActor = "client" | "professional";

export interface Booking {
  id: string;
  professionalId: string;
  clientUserId: string;
  /** Quién atiende (SPEC 22). */
  staffId: string;
  serviceVariantId: string;
  designId: string | null;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  priceClp: number;
  durationMinutes: number;
  clientNote: string | null;
  professionalNote: string | null;
  cancelledAt: Date | null;
  cancelledBy: BookingActor | null;
  googleEventId: string | null;
  /** Abono congelado al reservar (SPEC 21). `null` = sin abono. */
  depositClp: number | null;
  depositPaidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
