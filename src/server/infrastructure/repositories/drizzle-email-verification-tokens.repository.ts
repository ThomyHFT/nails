import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { emailVerificationTokens } from "@/server/infrastructure/db/schema/users";
import type { EmailVerificationToken } from "@/server/domain/auth/email-verification-token.entity";
import type {
  EmailVerificationTokensRepository,
  NewEmailVerificationToken,
} from "@/server/domain/auth/email-verification-tokens-repository.port";

function toDomain(row: typeof emailVerificationTokens.$inferSelect): EmailVerificationToken {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
    createdAt: row.createdAt,
  };
}

export class DrizzleEmailVerificationTokensRepository implements EmailVerificationTokensRepository {
  async create(token: NewEmailVerificationToken): Promise<EmailVerificationToken> {
    const [row] = await db
      .insert(emailVerificationTokens)
      .values({ userId: token.userId, tokenHash: token.tokenHash, expiresAt: token.expiresAt })
      .returning();
    return toDomain(row);
  }

  async findByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null> {
    const [row] = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.tokenHash, tokenHash))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async markUsed(id: string): Promise<void> {
    await db.update(emailVerificationTokens).set({ usedAt: new Date() }).where(eq(emailVerificationTokens.id, id));
  }

  async countRecentByUserId(userId: string, since: Date): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailVerificationTokens)
      .where(and(eq(emailVerificationTokens.userId, userId), gte(emailVerificationTokens.createdAt, since)));
    return row?.count ?? 0;
  }
}
