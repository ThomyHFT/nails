import { CalendarAccessRevokedError } from "@/server/domain/calendar/calendar-errors";
import type { CalendarEventDraft, CalendarGateway } from "@/server/domain/calendar/calendar-gateway.port";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export class GoogleCalendarGateway implements CalendarGateway {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  private async getAccessToken(refreshToken: string): Promise<string> {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      if (body?.error === "invalid_grant") {
        throw new CalendarAccessRevokedError();
      }
      throw new Error(`No se pudo obtener el access token de Google: ${response.status}`);
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  async createEvent(refreshToken: string, draft: CalendarEventDraft): Promise<string> {
    const accessToken = await this.getAccessToken(refreshToken);

    const response = await fetch(EVENTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: draft.summary,
        description: draft.description,
        start: { dateTime: draft.startsAt.toISOString(), timeZone: draft.timeZone },
        end: { dateTime: draft.endsAt.toISOString(), timeZone: draft.timeZone },
      }),
    });

    if (!response.ok) {
      throw new Error(`No se pudo crear el evento en Google Calendar: ${response.status}`);
    }

    const data = (await response.json()) as { id: string };
    return data.id;
  }

  async deleteEvent(refreshToken: string, eventId: string): Promise<void> {
    const accessToken = await this.getAccessToken(refreshToken);

    const response = await fetch(`${EVENTS_URL}/${eventId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok && response.status !== 410) {
      throw new Error(`No se pudo borrar el evento de Google Calendar: ${response.status}`);
    }
  }
}
