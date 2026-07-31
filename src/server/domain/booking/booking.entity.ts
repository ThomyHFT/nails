export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type BookingActor = "client" | "professional";

export interface Booking {
  id: string;
  professionalId: string;
  clientUserId: string;
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
  createdAt: Date;
  updatedAt: Date;
}
