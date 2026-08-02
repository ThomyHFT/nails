import type { EmailVerificationToken } from "@/server/domain/auth/email-verification-token.entity";
import type {
  EmailVerificationTokensRepository,
  NewEmailVerificationToken,
} from "@/server/domain/auth/email-verification-tokens-repository.port";

export class InMemoryEmailVerificationTokensRepository implements EmailVerificationTokensRepository {
  tokens: EmailVerificationToken[] = [];
  private nextId = 1;

  async create(token: NewEmailVerificationToken): Promise<EmailVerificationToken> {
    const row: EmailVerificationToken = {
      id: String(this.nextId++),
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      usedAt: null,
      createdAt: new Date(),
    };
    this.tokens.push(row);
    return row;
  }

  async findByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null> {
    return this.tokens.find((t) => t.tokenHash === tokenHash) ?? null;
  }

  async markUsed(id: string): Promise<void> {
    const token = this.tokens.find((t) => t.id === id);
    if (token) {
      token.usedAt = new Date();
    }
  }

  async countRecentByUserId(userId: string, since: Date): Promise<number> {
    return this.tokens.filter((t) => t.userId === userId && t.createdAt >= since).length;
  }
}
