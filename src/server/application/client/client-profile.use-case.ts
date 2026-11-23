import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { Booking } from "@/server/domain/booking/booking.entity";
import { CLIENT_NOTE_MAX_LENGTH, type ClientNote, type ClientNotesRepository } from "@/server/domain/client/client-note";
import type { UserRepository } from "@/server/domain/user/user-repository.port";
import type { User } from "@/server/domain/user/user.entity";

export interface ClientProfile {
  client: Pick<User, "id" | "name" | "email" | "phone" | "createdAt">;
  /** Historial con este negocio, la más reciente primero. */
  bookings: Booking[];
  totals: {
    bookings: number;
    completed: number;
    spentClp: number;
    strikes: number;
    noShows: number;
    lastVisitAt: Date | null;
    nextBookingAt: Date | null;
  };
  note: ClientNote | null;
}

export class ClientNotFoundError extends Error {
  constructor() {
    super("Clienta no encontrada");
    this.name = "ClientNotFoundError";
  }
}

export class ClientNoteTooLongError extends Error {
  constructor() {
    super(`La nota puede tener hasta ${CLIENT_NOTE_MAX_LENGTH} caracteres.`);
    this.name = "ClientNoteTooLongError";
  }
}

/**
 * Ficha de clienta (SPEC 20). Una clienta sin reservas con este negocio no
 * existe para él: así la ficha nunca expone clientas de otro tenant.
 */
export class GetClientProfileUseCase {
  constructor(
    private readonly bookings: BookingRepository,
    private readonly users: UserRepository,
    private readonly notes: ClientNotesRepository,
  ) {}

  async execute(professionalId: string, clientUserId: string, now = new Date()): Promise<ClientProfile> {
    const history = (await this.bookings.listByProfessionalAndClient(professionalId, clientUserId)).sort(
      (a, b) => b.startsAt.getTime() - a.startsAt.getTime(),
    );
    if (history.length === 0) throw new ClientNotFoundError();
    const [client, note] = await Promise.all([
      this.users.findById(clientUserId),
      this.notes.find(professionalId, clientUserId),
    ]);
    if (!client) throw new ClientNotFoundError();

    const completed = history.filter((b) => b.status === "completed");
    const upcoming = history
      .filter((b) => (b.status === "pending" || b.status === "confirmed") && b.startsAt > now)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    return {
      client: { id: client.id, name: client.name, email: client.email, phone: client.phone, createdAt: client.createdAt },
      bookings: history,
      totals: {
        bookings: history.length,
        completed: completed.length,
        spentClp: completed.reduce((sum, b) => sum + b.priceClp, 0),
        strikes: history.filter((b) => b.cancelledBy === "client").length,
        noShows: history.filter((b) => b.status === "no_show").length,
        lastVisitAt: completed[0]?.startsAt ?? null,
        nextBookingAt: upcoming[0]?.startsAt ?? null,
      },
      note,
    };
  }
}

export class SaveClientNoteUseCase {
  constructor(
    private readonly bookings: BookingRepository,
    private readonly notes: ClientNotesRepository,
  ) {}

  async execute(professionalId: string, clientUserId: string, body: string): Promise<ClientNote> {
    const text = body.trim();
    if (text.length > CLIENT_NOTE_MAX_LENGTH) throw new ClientNoteTooLongError();
    const history = await this.bookings.listByProfessionalAndClient(professionalId, clientUserId);
    if (history.length === 0) throw new ClientNotFoundError();
    return this.notes.upsert(professionalId, clientUserId, text);
  }
}
