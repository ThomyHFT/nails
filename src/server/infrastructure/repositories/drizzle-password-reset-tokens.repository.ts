import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { passwordResetTokens } from "@/server/infrastructure/db/schema/users";
import type { PasswordResetToken } from "@/server/domain/auth/password-reset-token.entity";
import type {
  NewPasswordResetToken,
  PasswordResetTokensRepository,
} from "@/server/domain/auth/password-reset-tokens-repository.port";

function toDomain(row: typeof passwordResetTokens.$inferSelect): PasswordResetToken {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
    createdAt: row.createdAt,
  };
}

export class DrizzlePasswordResetTokensRepository implements PasswordResetTokensRepository {
  async create(token: NewPasswordResetToken): Promise<PasswordResetToken> {
    const [row] = await db
      .insert(passwordResetTokens)
      .values({
        userId: token.userId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
      })
      .returning();
    return toDomain(row);
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async markUsed(id: string): Promise<void> {
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
  }

  async countRecentByUserId(userId: string, since: Date): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.userId, userId), gte(passwordResetTokens.createdAt, since)));
    return row?.count ?? 0;
  }
}
