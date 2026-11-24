import { and, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { bookings } from "@/server/infrastructure/db/schema/bookings";
import { designs } from "@/server/infrastructure/db/schema/designs";
import type { Booking, BookingActor, BookingStatus } from "@/server/domain/booking/booking.entity";
import type { ClientBookingStats } from "@/server/domain/booking/client-booking-stats.entity";
import {
  BookingSlotTakenError,
  type BookingRepository,
  type NewBooking,
  type NewBookingWithDesign,
} from "@/server/domain/booking/booking-repository.port";

const ACTIVE_STATUSES: BookingStatus[] = ["pending", "confirmed"];

const EXCLUSION_VIOLATION = "23P01";

/** Drizzle envuelve el error del driver en `cause`; se recorre la cadena buscando el código de Postgres. */
function isOverlapViolation(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; current && depth < 5; depth++) {
    if ((current as { code?: unknown }).code === EXCLUSION_VIOLATION) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

async function translateOverlap<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (err) {
    if (isOverlapViolation(err)) throw new BookingSlotTakenError();
    throw err;
  }
}

function toDomain(row: typeof bookings.$inferSelect): Booking {
  return {
    id: row.id,
    professionalId: row.professionalId,
    clientUserId: row.clientUserId,
    staffId: row.staffId,
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
    googleEventId: row.googleEventId,
    depositClp: row.depositClp,
    depositPaidAt: row.depositPaidAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleBookingRepository implements BookingRepository {
  // El constraint `bookings_no_overlap` (migración 0021) rechaza dos reservas
  // activas solapadas de la misma profesional; acá se traduce a un error de dominio.
  async create(booking: NewBooking): Promise<Booking> {
    return translateOverlap(() => this.insertBooking(booking));
  }

  async createWithDesign(booking: NewBookingWithDesign): Promise<Booking> {
    return translateOverlap(() => this.insertBookingWithDesign(booking));
  }

  private async insertBooking(booking: NewBooking): Promise<Booking> {
    const [row] = await db
      .insert(bookings)
      .values({
        professionalId: booking.professionalId,
        clientUserId: booking.clientUserId,
        staffId: booking.staffId,
        serviceVariantId: booking.serviceVariantId,
        designId: booking.designId ?? null,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        status: booking.status ?? "pending",
        priceClp: booking.priceClp,
        durationMinutes: booking.durationMinutes,
        clientNote: booking.clientNote ?? null,
        depositClp: booking.depositClp ?? null,
      })
      .returning();
    return toDomain(row);
  }

  // db.batch corre como una transacción en neon-http: si el insert de la
  // reserva choca con el constraint, el diseño tampoco queda guardado.
  private async insertBookingWithDesign(booking: NewBookingWithDesign): Promise<Booking> {
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
          staffId: booking.staffId,
          serviceVariantId: booking.serviceVariantId,
          designId,
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          status: booking.status ?? "pending",
          priceClp: booking.priceClp,
          durationMinutes: booking.durationMinutes,
          clientNote: booking.clientNote ?? null,
          depositClp: booking.depositClp ?? null,
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

  async listActiveByStaffInRange(staffId: string, rangeStart: Date, rangeEnd: Date): Promise<Booking[]> {
    const rows = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.staffId, staffId),
          inArray(bookings.status, ACTIVE_STATUSES),
          lt(bookings.startsAt, rangeEnd),
          gt(bookings.endsAt, rangeStart),
        ),
      );
    return rows.map(toDomain);
  }

  async listByStaff(staffId: string): Promise<Booking[]> {
    const rows = await db.select().from(bookings).where(eq(bookings.staffId, staffId)).orderBy(desc(bookings.startsAt));
    return rows.map(toDomain);
  }

  async reassign(id: string, staffId: string, fromStatuses: readonly BookingStatus[]): Promise<Booking | null> {
    const [row] = await translateOverlap(() =>
      db
        .update(bookings)
        .set({ staffId, updatedAt: new Date() })
        .where(and(eq(bookings.id, id), inArray(bookings.status, [...fromStatuses])))
        .returning(),
    );
    return row ? toDomain(row) : null;
  }

  async listByProfessionalAndClient(professionalId: string, clientUserId: string): Promise<Booking[]> {
    const rows = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.professionalId, professionalId), eq(bookings.clientUserId, clientUserId)))
      .orderBy(desc(bookings.startsAt));
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

  async markDepositPaid(id: string): Promise<Booking | null> {
    const [row] = await db
      .update(bookings)
      .set({ depositPaidAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(bookings.id, id),
          isNotNull(bookings.depositClp),
          isNull(bookings.depositPaidAt),
          inArray(bookings.status, ["pending", "confirmed"]),
        ),
      )
      .returning();
    return row ? toDomain(row) : null;
  }

  async listCompletedAwaitingRebook(from: Date, to: Date): Promise<Booking[]> {
    const rows = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "completed"),
          isNull(bookings.rebookSentAt),
          gte(bookings.startsAt, from),
          lt(bookings.startsAt, to),
        ),
      );
    return rows.map(toDomain);
  }

  async claimRebook(id: string): Promise<boolean> {
    const rows = await db
      .update(bookings)
      .set({ rebookSentAt: new Date() })
      .where(and(eq(bookings.id, id), isNull(bookings.rebookSentAt)))
      .returning({ id: bookings.id });
    return rows.length > 0;
  }

  async updateStatus(id: string, status: BookingStatus, fromStatuses: readonly BookingStatus[]): Promise<Booking | null> {
    const [row] = await db
      .update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(bookings.id, id), inArray(bookings.status, [...fromStatuses])))
      .returning();
    return row ? toDomain(row) : null;
  }

  async reschedule(
    id: string,
    startsAt: Date,
    endsAt: Date,
    fromStatuses: readonly BookingStatus[],
  ): Promise<Booking | null> {
    const [row] = await translateOverlap(() =>
      db
        .update(bookings)
        .set({ startsAt, endsAt, reminderSentAt: null, updatedAt: new Date() })
        .where(and(eq(bookings.id, id), inArray(bookings.status, [...fromStatuses])))
        .returning(),
    );
    return row ? toDomain(row) : null;
  }

  async cancel(id: string, cancelledBy: BookingActor, fromStatuses: readonly BookingStatus[]): Promise<Booking | null> {
    const [row] = await db
      .update(bookings)
      .set({ status: "cancelled", cancelledBy, cancelledAt: new Date(), updatedAt: new Date() })
      .where(and(eq(bookings.id, id), inArray(bookings.status, [...fromStatuses])))
      .returning();
    return row ? toDomain(row) : null;
  }

  async listAwaitingReminder(from: Date, to: Date): Promise<Booking[]> {
    const rows = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "confirmed"),
          isNull(bookings.reminderSentAt),
          gte(bookings.startsAt, from),
          lt(bookings.startsAt, to),
        ),
      );
    return rows.map(toDomain);
  }

  async claimReminder(id: string): Promise<boolean> {
    const rows = await db
      .update(bookings)
      .set({ reminderSentAt: new Date() })
      .where(and(eq(bookings.id, id), isNull(bookings.reminderSentAt)))
      .returning({ id: bookings.id });
    return rows.length > 0;
  }

  async setGoogleEventId(id: string, googleEventId: string | null): Promise<void> {
    await db.update(bookings).set({ googleEventId, updatedAt: new Date() }).where(eq(bookings.id, id));
  }

  async listConfirmedFutureWithoutCalendarEvent(professionalId: string, now: Date): Promise<Booking[]> {
    const rows = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.professionalId, professionalId),
          eq(bookings.status, "confirmed"),
          gt(bookings.startsAt, now),
          isNull(bookings.googleEventId),
        ),
      );
    return rows.map(toDomain);
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
