import { describe, expect, it } from "vitest";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { InMemoryClientNotesRepository } from "@/server/application/client/__fakes__/in-memory-client-notes-repository";
import {
  ClientNoteTooLongError,
  ClientNotFoundError,
  GetClientProfileUseCase,
  SaveClientNoteUseCase,
} from "@/server/application/client/client-profile.use-case";

const NOW = new Date("2026-08-15T12:00:00Z");

async function setup() {
  const bookings = new InMemoryBookingRepository();
  const users = new InMemoryUserRepository();
  const notes = new InMemoryClientNotesRepository();
  const client = await users.create({ email: "cami@example.com", passwordHash: "h", name: "Cami", role: "client" });

  async function book(professionalId: string, startsAt: string, priceClp = 15_000) {
    const start = new Date(startsAt);
    return bookings.create({
      professionalId,
      clientUserId: client.id,
      serviceVariantId: "v",
      startsAt: start,
      endsAt: new Date(start.getTime() + 3_600_000),
      priceClp,
      durationMinutes: 60,
    });
  }

  return {
    bookings,
    client,
    notes,
    book,
    profile: new GetClientProfileUseCase(bookings, users, notes),
    saveNote: new SaveClientNoteUseCase(bookings, notes),
  };
}

describe("Ficha de clienta (SPEC 20)", () => {
  it("adds up only this business's history", async () => {
    const { book, bookings, client, profile } = await setup();
    const done = await book("prof-1", "2026-08-01T14:00:00Z", 20_000);
    await bookings.updateStatus(done.id, "completed");
    const cancelled = await book("prof-1", "2026-08-05T14:00:00Z");
    await bookings.cancel(cancelled.id, "client");
    const noShow = await book("prof-1", "2026-08-08T14:00:00Z");
    await bookings.updateStatus(noShow.id, "no_show");
    await book("prof-1", "2026-08-20T14:00:00Z");
    await book("prof-2", "2026-08-02T14:00:00Z", 99_000); // otro negocio

    const result = await profile.execute("prof-1", client.id, NOW);

    expect(result.bookings).toHaveLength(4);
    expect(result.bookings[0].startsAt.toISOString()).toBe("2026-08-20T14:00:00.000Z");
    expect(result.totals).toMatchObject({ bookings: 4, completed: 1, spentClp: 20_000, strikes: 1, noShows: 1 });
    expect(result.totals.lastVisitAt?.toISOString()).toBe("2026-08-01T14:00:00.000Z");
    expect(result.totals.nextBookingAt?.toISOString()).toBe("2026-08-20T14:00:00.000Z");
  });

  it("does not show a client who never booked with this business", async () => {
    const { book, client, profile, saveNote } = await setup();
    await book("prof-2", "2026-08-02T14:00:00Z");

    await expect(profile.execute("prof-1", client.id, NOW)).rejects.toBeInstanceOf(ClientNotFoundError);
    await expect(saveNote.execute("prof-1", client.id, "espía")).rejects.toBeInstanceOf(ClientNotFoundError);
  });

  it("keeps one private note per business and client", async () => {
    const { book, client, profile, saveNote, notes } = await setup();
    await book("prof-1", "2026-08-02T14:00:00Z");
    await book("prof-2", "2026-08-02T16:00:00Z");

    await saveNote.execute("prof-1", client.id, "  Alérgica al acrílico  ");
    await saveNote.execute("prof-1", client.id, "Alérgica al acrílico. Prefiere almendra.");
    await saveNote.execute("prof-2", client.id, "Nota de otro negocio");

    expect(notes.notes).toHaveLength(2);
    expect((await profile.execute("prof-1", client.id, NOW)).note?.body).toBe("Alérgica al acrílico. Prefiere almendra.");
  });

  it("rejects a note over 2000 characters", async () => {
    const { book, client, saveNote } = await setup();
    await book("prof-1", "2026-08-02T14:00:00Z");

    await expect(saveNote.execute("prof-1", client.id, "x".repeat(2001))).rejects.toBeInstanceOf(ClientNoteTooLongError);
  });
});
