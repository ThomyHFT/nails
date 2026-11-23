import { and, eq } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { clientNotes } from "@/server/infrastructure/db/schema/clients";
import type { ClientNote, ClientNotesRepository } from "@/server/domain/client/client-note";

function toDomain(row: typeof clientNotes.$inferSelect): ClientNote {
  return { professionalId: row.professionalId, clientUserId: row.clientUserId, body: row.body, updatedAt: row.updatedAt };
}

export class DrizzleClientNotesRepository implements ClientNotesRepository {
  async find(professionalId: string, clientUserId: string): Promise<ClientNote | null> {
    const [row] = await db
      .select()
      .from(clientNotes)
      .where(and(eq(clientNotes.professionalId, professionalId), eq(clientNotes.clientUserId, clientUserId)))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async upsert(professionalId: string, clientUserId: string, body: string): Promise<ClientNote> {
    const now = new Date();
    const [row] = await db
      .insert(clientNotes)
      .values({ professionalId, clientUserId, body, updatedAt: now })
      .onConflictDoUpdate({
        target: [clientNotes.professionalId, clientNotes.clientUserId],
        set: { body, updatedAt: now },
      })
      .returning();
    return toDomain(row);
  }
}
