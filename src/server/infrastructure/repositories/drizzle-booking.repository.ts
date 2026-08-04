import { and, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { bookings } from "@/server/infrastructure/db/schema/bookings";
import { designs } from "@/server/infrastructure/db/schema/designs";
import type { Booking, BookingActor, BookingStatus } from "@/server/domain/booking/booking.entity";
import type { ClientBookingStats } from "@/server/domain/booking/client-booking-stats.entity";
import type {
  BookingRepository,
  NewBooking,
  NewBookingWithDesign,
} from "@/server/domain/booking/booking-repository.port";

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

  async createWithDesign(booking: NewBookingWithDesign): Promise<Booking> {
    const designId = crypto.randomUUID();
    const bookingId = crypto.randomUUID();

    const [, bookingRows] = await db.batch([
      db.insert(designs).values({
        id: designId,
        professionalId: booking.professionalId,
        clientUserId: booking.clientUserId,
        source: "client",
        name: null,
        payload: booking.design.payload,
        extraPriceClp: booking.design.extraPriceClp,
        extraMinutes: booking.design.extraMinutes,
        referenceImageUrl: booking.design.referenceImageUrl ?? null,
      }),
      db
        .insert(bookings)
        .values({
          id: bookingId,
          professionalId: booking.professionalId,
          clientUserId: booking.clientUserId,
          serviceVariantId: booking.serviceVariantId,
          designId,
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          status: "pending",
          priceClp: booking.priceClp,
          durationMinutes: booking.durationMinutes,
          clientNote: booking.clientNote ?? null,
        })
        .returning(),
    ]);

    return toDomain(bookingRows[0]);
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

  async listClientStats(professionalId: string): Promise<ClientBookingStats[]> {
    const rows = await db
      .select({
        clientUserId: bookings.clientUserId,
        totalBookings: sql<number>`count(*)::int`,
        completedBookings: sql<number>`count(*) filter (where ${bookings.status} = 'completed')::int`,
        totalSpentClp: sql<number>`coalesce(sum(${bookings.priceClp}) filter (where ${bookings.status} = 'completed'), 0)::int`,
        // string y no Date: el driver http de neon no parsea las expresiones
        // sql crudas al tipo de la columna, a diferencia de un select directo.
        lastBookingAt: sql<string>`max(${bookings.startsAt})`,
        strikes: sql<number>`count(*) filter (where ${bookings.cancelledBy} = 'client')::int`,
      })
      .from(bookings)
      .where(eq(bookings.professionalId, professionalId))
      .groupBy(bookings.clientUserId)
      .orderBy(desc(sql`max(${bookings.startsAt})`));

    return rows.map((row) => ({ ...row, lastBookingAt: new Date(row.lastBookingAt) }));
  }

  async countPending(professionalId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(and(eq(bookings.professionalId, professionalId), eq(bookings.status, "pending")));
    return row?.count ?? 0;
  }
}
