import type { ClientNote, ClientNotesRepository } from "@/server/domain/client/client-note";

export class InMemoryClientNotesRepository implements ClientNotesRepository {
  readonly notes: ClientNote[] = [];

  async find(professionalId: string, clientUserId: string): Promise<ClientNote | null> {
    return this.notes.find((n) => n.professionalId === professionalId && n.clientUserId === clientUserId) ?? null;
  }

  async upsert(professionalId: string, clientUserId: string, body: string): Promise<ClientNote> {
    const existing = await this.find(professionalId, clientUserId);
    if (existing) {
      existing.body = body;
      existing.updatedAt = new Date();
      return existing;
    }
    const note = { professionalId, clientUserId, body, updatedAt: new Date() };
    this.notes.push(note);
    return note;
  }
}
