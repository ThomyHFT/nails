import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { emailCodes } from "@/server/infrastructure/db/schema/clients";
import type { EmailCode, EmailCodePurpose, EmailCodesRepository, NewEmailCode } from "@/server/domain/auth/email-code";

function toDomain(row: typeof emailCodes.$inferSelect): EmailCode {
  return { ...row };
}

export class DrizzleEmailCodesRepository implements EmailCodesRepository {
  async create(code: NewEmailCode): Promise<EmailCode> {
    const [row] = await db.insert(emailCodes).values(code).returning();
    return toDomain(row);
  }

  async findLatestActive(email: string, purpose: EmailCodePurpose, userId: string | null): Promise<EmailCode | null> {
    const [row] = await db
      .select()
      .from(emailCodes)
      .where(
        and(
          eq(emailCodes.email, email),
          eq(emailCodes.purpose, purpose),
          userId === null ? isNull(emailCodes.userId) : eq(emailCodes.userId, userId),
          isNull(emailCodes.consumedAt),
        ),
      )
      .orderBy(desc(emailCodes.createdAt))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async countCreatedSince(email: string, purpose: EmailCodePurpose, since: Date): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(emailCodes)
      .where(and(eq(emailCodes.email, email), eq(emailCodes.purpose, purpose), gte(emailCodes.createdAt, since)));
    return row?.value ?? 0;
  }

  async incrementAttempts(id: string): Promise<void> {
    await db
      .update(emailCodes)
      .set({ attempts: sql`${emailCodes.attempts} + 1` })
      .where(eq(emailCodes.id, id));
  }

  async consume(id: string): Promise<boolean> {
    const rows = await db
      .update(emailCodes)
      .set({ consumedAt: new Date() })
      .where(and(eq(emailCodes.id, id), isNull(emailCodes.consumedAt)))
      .returning({ id: emailCodes.id });
    return rows.length > 0;
  }
}
