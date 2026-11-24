import { and, asc, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { waitlistEntries } from "@/server/infrastructure/db/schema/commerce";
import type { NewWaitlistEntry, WaitlistEntry, WaitlistRepository } from "@/server/domain/waitlist/waitlist";

function toDomain(row: typeof waitlistEntries.$inferSelect): WaitlistEntry {
  return {
    id: row.id,
    professionalId: row.professionalId,
    clientUserId: row.clientUserId,
    serviceVariantId: row.serviceVariantId,
    date: row.date,
    createdAt: row.createdAt,
    notifiedAt: row.notifiedAt,
  };
}

export class DrizzleWaitlistRepository implements WaitlistRepository {
  async createOrGet(entry: NewWaitlistEntry): Promise<WaitlistEntry> {
    const [created] = await db.insert(waitlistEntries).values(entry).onConflictDoNothing().returning();
    if (created) return toDomain(created);
    const [existing] = await db
      .select()
      .from(waitlistEntries)
      .where(
        and(
          eq(waitlistEntries.professionalId, entry.professionalId),
          eq(waitlistEntries.clientUserId, entry.clientUserId),
          eq(waitlistEntries.date, entry.date),
        ),
      )
      .limit(1);
    return toDomain(existing);
  }

  async findById(id: string): Promise<WaitlistEntry | null> {
    const [row] = await db.select().from(waitlistEntries).where(eq(waitlistEntries.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async delete(id: string): Promise<void> {
    await db.delete(waitlistEntries).where(eq(waitlistEntries.id, id));
  }

  async listByClient(professionalId: string, clientUserId: string, fromDate: string): Promise<WaitlistEntry[]> {
    const rows = await db
      .select()
      .from(waitlistEntries)
      .where(
        and(
          eq(waitlistEntries.professionalId, professionalId),
          eq(waitlistEntries.clientUserId, clientUserId),
          gte(waitlistEntries.date, fromDate),
        ),
      )
      .orderBy(asc(waitlistEntries.date));
    return rows.map(toDomain);
  }

  async listByProfessional(professionalId: string, fromDate: string): Promise<WaitlistEntry[]> {
    const rows = await db
      .select()
      .from(waitlistEntries)
      .where(and(eq(waitlistEntries.professionalId, professionalId), gte(waitlistEntries.date, fromDate)))
      .orderBy(asc(waitlistEntries.date), asc(waitlistEntries.createdAt));
    return rows.map(toDomain);
  }

  async listUnnotified(professionalId: string, date: string): Promise<WaitlistEntry[]> {
    const rows = await db
      .select()
      .from(waitlistEntries)
      .where(
        and(
          eq(waitlistEntries.professionalId, professionalId),
          eq(waitlistEntries.date, date),
          isNull(waitlistEntries.notifiedAt),
        ),
      )
      .orderBy(asc(waitlistEntries.createdAt));
    return rows.map(toDomain);
  }

  async claimNotification(id: string): Promise<boolean> {
    const rows = await db
      .update(waitlistEntries)
      .set({ notifiedAt: new Date() })
      .where(and(eq(waitlistEntries.id, id), isNull(waitlistEntries.notifiedAt)))
      .returning({ id: waitlistEntries.id });
    return rows.length > 0;
  }
}
