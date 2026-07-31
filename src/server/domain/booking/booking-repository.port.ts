import type { Booking, BookingActor, BookingStatus } from "@/server/domain/booking/booking.entity";

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
}

export interface BookingRepository {
  create(booking: NewBooking): Promise<Booking>;
  findById(id: string): Promise<Booking | null>;
  listActiveByProfessionalInRange(professionalId: string, rangeStart: Date, rangeEnd: Date): Promise<Booking[]>;
  listByProfessional(professionalId: string, status?: BookingStatus): Promise<Booking[]>;
  listByClient(clientUserId: string): Promise<Booking[]>;
  updateStatus(id: string, status: BookingStatus): Promise<Booking>;
  cancel(id: string, cancelledBy: BookingActor): Promise<Booking>;
  countClientStrikes(professionalId: string, clientUserId: string): Promise<number>;
}
