import type { PasswordResetToken } from "@/server/domain/auth/password-reset-token.entity";
import type {
  NewPasswordResetToken,
  PasswordResetTokensRepository,
} from "@/server/domain/auth/password-reset-tokens-repository.port";

export class InMemoryPasswordResetTokensRepository implements PasswordResetTokensRepository {
  tokens: PasswordResetToken[] = [];
  private nextId = 1;

  async create(token: NewPasswordResetToken): Promise<PasswordResetToken> {
    const row: PasswordResetToken = {
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

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
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
