import type { GoogleCalendarConnection } from "@/server/domain/calendar/google-calendar-connection.entity";
import type {
  GoogleCalendarConnectionRepository,
  GoogleCalendarConnectionUpsert,
} from "@/server/domain/calendar/google-calendar-connection-repository.port";

export class InMemoryGoogleCalendarConnectionRepository implements GoogleCalendarConnectionRepository {
  private readonly connections: GoogleCalendarConnection[] = [];
  private nextId = 1;

  async findByProfessionalId(professionalId: string): Promise<GoogleCalendarConnection | null> {
    return this.connections.find((c) => c.professionalId === professionalId) ?? null;
  }

  async upsert(input: GoogleCalendarConnectionUpsert): Promise<void> {
    const existing = this.connections.find((c) => c.professionalId === input.professionalId);
    if (existing) {
      existing.googleAccountEmail = input.googleAccountEmail;
      existing.refreshToken = input.refreshToken;
      existing.status = "active";
      return;
    }

    this.connections.push({
      id: String(this.nextId++),
      professionalId: input.professionalId,
      googleAccountEmail: input.googleAccountEmail,
      refreshToken: input.refreshToken,
      status: "active",
      connectedAt: new Date(),
    });
  }

  async markRevoked(professionalId: string): Promise<void> {
    const connection = this.connections.find((c) => c.professionalId === professionalId);
    if (connection) connection.status = "revoked";
  }

  async delete(professionalId: string): Promise<void> {
    const index = this.connections.findIndex((c) => c.professionalId === professionalId);
    if (index !== -1) this.connections.splice(index, 1);
  }
}
