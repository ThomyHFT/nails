import { and, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { bookings } from "@/server/infrastructure/db/schema/bookings";
import type { Booking, BookingActor, BookingStatus } from "@/server/domain/booking/booking.entity";
import type { BookingRepository, NewBooking } from "@/server/domain/booking/booking-repository.port";

const ACTIVE_STATUSES: BookingStatus[] = ["pending", "confirmed"];

function toDomain(row: typeof bookings.$inferSelect): Booking {
  return {
    id: row.id,
    professionalId: row.professionalId,
    clientUserId: row.clientUserId,
    serviceVariantId: row.serviceVariantId,
    designId: row.designId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status,
    priceClp: row.priceClp,
    durationMinutes: row.durationMinutes,
    clientNote: row.clientNote,
    professionalNote: row.professionalNote,
    cancelledAt: row.cancelledAt,
    cancelledBy: row.cancelledBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleBookingRepository implements BookingRepository {
  async create(booking: NewBooking): Promise<Booking> {
    const [row] = await db
      .insert(bookings)
      .values({
        professionalId: booking.professionalId,
        clientUserId: booking.clientUserId,
        serviceVariantId: booking.serviceVariantId,
        designId: booking.designId ?? null,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        status: "pending",
        priceClp: booking.priceClp,
        durationMinutes: booking.durationMinutes,
        clientNote: booking.clientNote ?? null,
      })
      .returning();
    return toDomain(row);
  }

  async findById(id: string): Promise<Booking | null> {
    const [row] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async listActiveByProfessionalInRange(
    professionalId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<Booking[]> {
    const rows = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.professionalId, professionalId),
          inArray(bookings.status, ACTIVE_STATUSES),
          lt(bookings.startsAt, rangeEnd),
          gt(bookings.endsAt, rangeStart),
        ),
      );
    return rows.map(toDomain);
  }

  async listByProfessional(professionalId: string, status?: BookingStatus): Promise<Booking[]> {
    const rows = await db
      .select()
      .from(bookings)
      .where(
        status
          ? and(eq(bookings.professionalId, professionalId), eq(bookings.status, status))
          : eq(bookings.professionalId, professionalId),
      )
      .orderBy(desc(bookings.startsAt));
    return rows.map(toDomain);
  }

  async listByClient(clientUserId: string): Promise<Booking[]> {
    const rows = await db
      .select()
      .from(bookings)
      .where(eq(bookings.clientUserId, clientUserId))
      .orderBy(desc(bookings.startsAt));
    return rows.map(toDomain);
  }

  async updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    const [row] = await db
      .update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return toDomain(row);
  }

  async cancel(id: string, cancelledBy: BookingActor): Promise<Booking> {
    const [row] = await db
      .update(bookings)
      .set({ status: "cancelled", cancelledBy, cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return toDomain(row);
  }

  async countClientStrikes(professionalId: string, clientUserId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(
        and(
          eq(bookings.professionalId, professionalId),
          eq(bookings.clientUserId, clientUserId),
          eq(bookings.cancelledBy, "client"),
        ),
      );
    return row?.count ?? 0;
  }
}
