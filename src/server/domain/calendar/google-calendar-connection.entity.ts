export interface GoogleCalendarConnection {
  id: string;
  professionalId: string;
  googleAccountEmail: string;
  refreshToken: string;
  status: "active" | "revoked";
  connectedAt: Date;
}
