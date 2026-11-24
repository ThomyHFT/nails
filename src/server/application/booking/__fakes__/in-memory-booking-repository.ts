import { DEFAULT_TEST_STAFF_ID } from "@/server/application/booking/__fakes__/in-memory-availability-repository";
import type { Booking, BookingActor, BookingStatus } from "@/server/domain/booking/booking.entity";
import type { ClientBookingStats } from "@/server/domain/booking/client-booking-stats.entity";
import {
  BookingSlotTakenError,
  type BookingRepository,
  type NewBooking,
  type NewBookingWithDesign,
} from "@/server/domain/booking/booking-repository.port";

const ACTIVE_STATUSES: BookingStatus[] = ["pending", "confirmed"];

export class InMemoryBookingRepository implements BookingRepository {
  private readonly bookings: Booking[] = [];
  private nextId = 1;
  readonly designs: Array<{ id: string; referenceImageUrl: string | null }> = [];

  // `staffId` opcional solo en el fake: los tests de una sola integrante no lo repiten.
  async create(booking: Omit<NewBooking, "staffId"> & { staffId?: string }): Promise<Booking> {
    const now = new Date();
    const created: Booking = {
      id: String(this.nextId++),
      professionalId: booking.professionalId,
      clientUserId: booking.clientUserId,
      staffId: booking.staffId ?? DEFAULT_TEST_STAFF_ID,
      serviceVariantId: booking.serviceVariantId,
      designId: booking.designId ?? null,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      status: booking.status ?? "pending",
      priceClp: booking.priceClp,
      durationMinutes: booking.durationMinutes,
      clientNote: booking.clientNote ?? null,
      professionalNote: null,
      cancelledAt: null,
      cancelledBy: null,
      googleEventId: null,
      depositClp: booking.depositClp ?? null,
      depositPaidAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.bookings.push(created);
    return created;
  }

  async createWithDesign(booking: Omit<NewBookingWithDesign, "staffId"> & { staffId?: string }): Promise<Booking> {
    const designId = String(this.nextId++);
    this.designs.push({ id: designId, referenceImageUrl: booking.design.referenceImageUrl ?? null });

    return this.create({
      professionalId: booking.professionalId,
      clientUserId: booking.clientUserId,
      staffId: booking.staffId,
      serviceVariantId: booking.serviceVariantId,
      designId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      priceClp: booking.priceClp,
      durationMinutes: booking.durationMinutes,
      clientNote: booking.clientNote,
      depositClp: booking.depositClp,
      status: booking.status,
    });
  }

  async findById(id: string): Promise<Booking | null> {
    return this.bookings.find((booking) => booking.id === id) ?? null;
  }

  async listActiveByProfessionalInRange(professionalId: string, rangeStart: Date, rangeEnd: Date): Promise<Booking[]> {
    return this.bookings.filter(
      (booking) =>
        booking.professionalId === professionalId &&
        ACTIVE_STATUSES.includes(booking.status) &&
        booking.startsAt < rangeEnd &&
        booking.endsAt > rangeStart,
    );
  }

  async listActiveByStaffInRange(staffId: string, rangeStart: Date, rangeEnd: Date): Promise<Booking[]> {
    return this.bookings.filter(
      (b) => b.staffId === staffId && ACTIVE_STATUSES.includes(b.status) && b.startsAt < rangeEnd && b.endsAt > rangeStart,
    );
  }

  async listByStaff(staffId: string): Promise<Booking[]> {
    return this.bookings.filter((b) => b.staffId === staffId);
  }

  async reassign(id: string, staffId: string, fromStatuses: readonly BookingStatus[]): Promise<Booking | null> {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) throw new Error(`Booking ${id} not found`);
    if (!fromStatuses.includes(booking.status)) return null;
    const clash = this.bookings.some(
      (b) =>
        b.id !== id &&
        b.staffId === staffId &&
        ACTIVE_STATUSES.includes(b.status) &&
        b.startsAt < booking.endsAt &&
        b.endsAt > booking.startsAt,
    );
    if (clash) throw new BookingSlotTakenError();
    booking.staffId = staffId;
    return booking;
  }

  async listByProfessional(professionalId: string, status?: BookingStatus): Promise<Booking[]> {
    return this.bookings.filter(
      (booking) => booking.professionalId === professionalId && (!status || booking.status === status),
    );
  }

  async listByProfessionalAndClient(professionalId: string, clientUserId: string): Promise<Booking[]> {
    return this.bookings.filter((b) => b.professionalId === professionalId && b.clientUserId === clientUserId);
  }

  async listByClient(clientUserId: string): Promise<Booking[]> {
    return this.bookings.filter((booking) => booking.clientUserId === clientUserId);
  }

  // fromStatuses es opcional solo en el fake: los tests lo usan para preparar
  // estados directamente. Sin él, no hay condición.
  async updateStatus(id: string, status: BookingStatus, fromStatuses?: readonly BookingStatus[]): Promise<Booking | null> {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) throw new Error(`Booking ${id} not found`);
    if (fromStatuses && !fromStatuses.includes(booking.status)) return null;
    booking.status = status;
    booking.updatedAt = new Date();
    return booking;
  }

  /** Reservas con recordatorio enviado (`reminder_sent_at` no nulo). */
  remindedIds = new Set<string>();

  async listAwaitingReminder(from: Date, to: Date): Promise<Booking[]> {
    return this.bookings.filter(
      (b) =>
        b.status === "confirmed" &&
        !this.remindedIds.has(b.id) &&
        b.startsAt.getTime() >= from.getTime() &&
        b.startsAt.getTime() < to.getTime(),
    );
  }

  async claimReminder(id: string): Promise<boolean> {
    if (this.remindedIds.has(id)) return false;
    this.remindedIds.add(id);
    return true;
  }

  async markDepositPaid(id: string): Promise<Booking | null> {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking || booking.depositClp === null || booking.depositPaidAt !== null) return null;
    if (booking.status !== "pending" && booking.status !== "confirmed") return null;
    booking.depositPaidAt = new Date();
    return booking;
  }

  /** Reservas con correo "vuelve a reservar" enviado. */
  rebookedIds = new Set<string>();

  async listCompletedAwaitingRebook(from: Date, to: Date): Promise<Booking[]> {
    return this.bookings.filter(
      (b) =>
        b.status === "completed" &&
        !this.rebookedIds.has(b.id) &&
        b.startsAt.getTime() >= from.getTime() &&
        b.startsAt.getTime() < to.getTime(),
    );
  }

  async claimRebook(id: string): Promise<boolean> {
    if (this.rebookedIds.has(id)) return false;
    this.rebookedIds.add(id);
    return true;
  }

  async reschedule(
    id: string,
    startsAt: Date,
    endsAt: Date,
    fromStatuses: readonly BookingStatus[],
  ): Promise<Booking | null> {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) throw new Error(`Booking ${id} not found`);
    if (!fromStatuses.includes(booking.status)) return null;
    booking.startsAt = startsAt;
    booking.endsAt = endsAt;
    booking.updatedAt = new Date();
    this.remindedIds.delete(id);
    return booking;
  }

  async cancel(id: string, cancelledBy: BookingActor, fromStatuses?: readonly BookingStatus[]): Promise<Booking | null> {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) throw new Error(`Booking ${id} not found`);
    if (fromStatuses && !fromStatuses.includes(booking.status)) return null;
    booking.status = "cancelled";
    booking.cancelledBy = cancelledBy;
    booking.cancelledAt = new Date();
    booking.updatedAt = new Date();
    return booking;
  }

  async setGoogleEventId(id: string, googleEventId: string | null): Promise<void> {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) throw new Error(`Booking ${id} not found`);
    booking.googleEventId = googleEventId;
    booking.updatedAt = new Date();
  }

  async listConfirmedFutureWithoutCalendarEvent(professionalId: string, now: Date): Promise<Booking[]> {
    return this.bookings.filter(
      (booking) =>
        booking.professionalId === professionalId &&
        booking.status === "confirmed" &&
        booking.startsAt > now &&
        booking.googleEventId === null,
    );
  }

  async countClientStrikes(professionalId: string, clientUserId: string): Promise<number> {
    return this.bookings.filter(
      (booking) =>
        booking.professionalId === professionalId &&
        booking.clientUserId === clientUserId &&
        booking.cancelledBy === "client",
    ).length;
  }

  async listClientStats(professionalId: string): Promise<ClientBookingStats[]> {
    const byClient = new Map<string, ClientBookingStats>();

    for (const booking of this.bookings) {
      if (booking.professionalId !== professionalId) continue;

      const stats = byClient.get(booking.clientUserId) ?? {
        clientUserId: booking.clientUserId,
        totalBookings: 0,
        completedBookings: 0,
        totalSpentClp: 0,
        lastBookingAt: booking.startsAt,
        strikes: 0,
      };

      stats.totalBookings += 1;
      if (booking.status === "completed") {
        stats.completedBookings += 1;
        stats.totalSpentClp += booking.priceClp;
      }
      if (booking.cancelledBy === "client") {
        stats.strikes += 1;
      }
      if (booking.startsAt > stats.lastBookingAt) {
        stats.lastBookingAt = booking.startsAt;
      }

      byClient.set(booking.clientUserId, stats);
    }

    return [...byClient.values()].sort((a, b) => b.lastBookingAt.getTime() - a.lastBookingAt.getTime());
  }

  async countPending(professionalId: string): Promise<number> {
    return this.bookings.filter((b) => b.professionalId === professionalId && b.status === "pending").length;
  }
}
