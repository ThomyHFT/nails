import type { Booking, BookingActor, BookingStatus } from "@/server/domain/booking/booking.entity";
import type { NailDesignPayload } from "@/server/domain/design/nail-design-payload";

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
  updateStatus(id: string, status: BookingStatus): Promise<Booking>;
  cancel(id: string, cancelledBy: BookingActor): Promise<Booking>;
  countClientStrikes(professionalId: string, clientUserId: string): Promise<number>;
}
