import { CalendarAccessRevokedError } from "@/server/domain/calendar/calendar-errors";
import type { CalendarEventDraft, CalendarGateway } from "@/server/domain/calendar/calendar-gateway.port";

export class InMemoryCalendarGateway implements CalendarGateway {
  private nextId = 1;
  readonly createdEvents: Array<{ refreshToken: string; draft: CalendarEventDraft; id: string }> = [];
  readonly deletedEventIds: string[] = [];
  revokedForRefreshToken: string | null = null;

  async createEvent(refreshToken: string, draft: CalendarEventDraft): Promise<string> {
    if (refreshToken === this.revokedForRefreshToken) throw new CalendarAccessRevokedError();
    const id = `event-${this.nextId++}`;
    this.createdEvents.push({ refreshToken, draft, id });
    return id;
  }

  async deleteEvent(refreshToken: string, eventId: string): Promise<void> {
    if (refreshToken === this.revokedForRefreshToken) throw new CalendarAccessRevokedError();
    this.deletedEventIds.push(eventId);
  }
}
