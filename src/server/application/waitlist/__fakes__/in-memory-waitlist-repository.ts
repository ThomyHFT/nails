import type { NewWaitlistEntry, WaitlistEntry, WaitlistRepository } from "@/server/domain/waitlist/waitlist";

export class InMemoryWaitlistRepository implements WaitlistRepository {
  readonly entries: WaitlistEntry[] = [];
  private nextId = 1;

  async createOrGet(entry: NewWaitlistEntry): Promise<WaitlistEntry> {
    const existing = this.entries.find(
      (e) => e.professionalId === entry.professionalId && e.clientUserId === entry.clientUserId && e.date === entry.date,
    );
    if (existing) return existing;
    const created: WaitlistEntry = { ...entry, id: `w-${this.nextId++}`, createdAt: new Date(), notifiedAt: null };
    this.entries.push(created);
    return created;
  }

  async findById(id: string): Promise<WaitlistEntry | null> {
    return this.entries.find((e) => e.id === id) ?? null;
  }

  async delete(id: string): Promise<void> {
    const index = this.entries.findIndex((e) => e.id === id);
    if (index >= 0) this.entries.splice(index, 1);
  }

  async listByClient(professionalId: string, clientUserId: string, fromDate: string): Promise<WaitlistEntry[]> {
    return this.entries.filter(
      (e) => e.professionalId === professionalId && e.clientUserId === clientUserId && e.date >= fromDate,
    );
  }

  async listByProfessional(professionalId: string, fromDate: string): Promise<WaitlistEntry[]> {
    return this.entries
      .filter((e) => e.professionalId === professionalId && e.date >= fromDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async listUnnotified(professionalId: string, date: string): Promise<WaitlistEntry[]> {
    return this.entries.filter((e) => e.professionalId === professionalId && e.date === date && !e.notifiedAt);
  }

  async claimNotification(id: string): Promise<boolean> {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry || entry.notifiedAt) return false;
    entry.notifiedAt = new Date();
    return true;
  }
}
