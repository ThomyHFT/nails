import { eq } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { googleCalendarConnections } from "@/server/infrastructure/db/schema/calendar";
import { AesTokenCipher } from "@/server/infrastructure/security/aes-token-cipher";
import type { GoogleCalendarConnection } from "@/server/domain/calendar/google-calendar-connection.entity";
import type {
  GoogleCalendarConnectionRepository,
  GoogleCalendarConnectionUpsert,
} from "@/server/domain/calendar/google-calendar-connection-repository.port";

function toDomain(
  row: typeof googleCalendarConnections.$inferSelect,
  cipher: AesTokenCipher,
): GoogleCalendarConnection {
  return {
    id: row.id,
    professionalId: row.professionalId,
    googleAccountEmail: row.googleAccountEmail,
    refreshToken: cipher.decrypt(row.refreshToken),
    status: row.status,
    connectedAt: row.connectedAt,
  };
}

export class DrizzleGoogleCalendarConnectionRepository implements GoogleCalendarConnectionRepository {
  constructor(private readonly cipher: AesTokenCipher) {}

  async findByProfessionalId(professionalId: string): Promise<GoogleCalendarConnection | null> {
    const [row] = await db
      .select()
      .from(googleCalendarConnections)
      .where(eq(googleCalendarConnections.professionalId, professionalId))
      .limit(1);
    return row ? toDomain(row, this.cipher) : null;
  }

  async upsert(input: GoogleCalendarConnectionUpsert): Promise<void> {
    const encryptedToken = this.cipher.encrypt(input.refreshToken);

    await db
      .insert(googleCalendarConnections)
      .values({
        professionalId: input.professionalId,
        googleAccountEmail: input.googleAccountEmail,
        refreshToken: encryptedToken,
      })
      .onConflictDoUpdate({
        target: googleCalendarConnections.professionalId,
        set: {
          googleAccountEmail: input.googleAccountEmail,
          refreshToken: encryptedToken,
          status: "active",
          revokedAt: null,
          updatedAt: new Date(),
        },
      });
  }

  async markRevoked(professionalId: string): Promise<void> {
    await db
      .update(googleCalendarConnections)
      .set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(googleCalendarConnections.professionalId, professionalId));
  }

  async delete(professionalId: string): Promise<void> {
    await db.delete(googleCalendarConnections).where(eq(googleCalendarConnections.professionalId, professionalId));
  }
}
