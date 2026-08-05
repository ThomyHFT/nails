import type { GoogleCalendarConnection } from "@/server/domain/calendar/google-calendar-connection.entity";

export interface GoogleCalendarConnectionUpsert {
  professionalId: string;
  googleAccountEmail: string;
  refreshToken: string;
}

export interface GoogleCalendarConnectionRepository {
  findByProfessionalId(professionalId: string): Promise<GoogleCalendarConnection | null>;
  upsert(input: GoogleCalendarConnectionUpsert): Promise<void>;
  markRevoked(professionalId: string): Promise<void>;
  delete(professionalId: string): Promise<void>;
}
