import type { EmailCode, EmailCodePurpose, EmailCodesRepository, NewEmailCode } from "@/server/domain/auth/email-code";

export class InMemoryEmailCodesRepository implements EmailCodesRepository {
  readonly codes: EmailCode[] = [];
  private nextId = 1;
  /** Reloj para `createdAt`: los tests de rate limit lo mueven. */
  clock: () => Date = () => new Date();

  async create(code: NewEmailCode): Promise<EmailCode> {
    const created: EmailCode = { ...code, id: String(this.nextId++), attempts: 0, consumedAt: null, createdAt: this.clock() };
    this.codes.push(created);
    return created;
  }

  async findLatestActive(email: string, purpose: EmailCodePurpose, userId: string | null): Promise<EmailCode | null> {
    const matches = this.codes.filter(
      (c) => c.email === email && c.purpose === purpose && c.userId === userId && c.consumedAt === null,
    );
    return matches.at(-1) ?? null;
  }

  async countCreatedSince(email: string, purpose: EmailCodePurpose, since: Date): Promise<number> {
    return this.codes.filter((c) => c.email === email && c.purpose === purpose && c.createdAt >= since).length;
  }

  async incrementAttempts(id: string): Promise<void> {
    const code = this.codes.find((c) => c.id === id);
    if (code) code.attempts += 1;
  }

  async consume(id: string): Promise<boolean> {
    const code = this.codes.find((c) => c.id === id);
    if (!code || code.consumedAt) return false;
    code.consumedAt = new Date();
    return true;
  }
}
