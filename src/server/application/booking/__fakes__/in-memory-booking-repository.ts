import type { Booking, BookingActor, BookingStatus } from "@/server/domain/booking/booking.entity";
import type { ClientBookingStats } from "@/server/domain/booking/client-booking-stats.entity";
import type {
  BookingRepository,
  NewBooking,
  NewBookingWithDesign,
} from "@/server/domain/booking/booking-repository.port";

const ACTIVE_STATUSES: BookingStatus[] = ["pending", "confirmed"];

export class InMemoryBookingRepository implements BookingRepository {
  private readonly bookings: Booking[] = [];
  private nextId = 1;
  readonly designs: Array<{ id: string; referenceImageUrl: string | null }> = [];

  async create(booking: NewBooking): Promise<Booking> {
    const now = new Date();
    const created: Booking = {
      id: String(this.nextId++),
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
      professionalNote: null,
      cancelledAt: null,
      cancelledBy: null,
      createdAt: now,
      updatedAt: now,
    };
    this.bookings.push(created);
    return created;
  }

  async createWithDesign(booking: NewBookingWithDesign): Promise<Booking> {
    const designId = String(this.nextId++);
    this.designs.push({ id: designId, referenceImageUrl: booking.design.referenceImageUrl ?? null });

    return this.create({
      professionalId: booking.professionalId,
      clientUserId: booking.clientUserId,
      serviceVariantId: booking.serviceVariantId,
      designId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      priceClp: booking.priceClp,
      durationMinutes: booking.durationMinutes,
      clientNote: booking.clientNote,
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

  async listByProfessional(professionalId: string, status?: BookingStatus): Promise<Booking[]> {
    return this.bookings.filter(
      (booking) => booking.professionalId === professionalId && (!status || booking.status === status),
    );
  }

  async listByClient(clientUserId: string): Promise<Booking[]> {
    return this.bookings.filter((booking) => booking.clientUserId === clientUserId);
  }

  async updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) throw new Error(`Booking ${id} not found`);
    booking.status = status;
    booking.updatedAt = new Date();
    return booking;
  }

  async cancel(id: string, cancelledBy: BookingActor): Promise<Booking> {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) throw new Error(`Booking ${id} not found`);
    booking.status = "cancelled";
    booking.cancelledBy = cancelledBy;
    booking.cancelledAt = new Date();
    booking.updatedAt = new Date();
    return booking;
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
