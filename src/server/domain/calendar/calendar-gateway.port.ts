export interface CalendarEventDraft {
  summary: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
}

export interface CalendarGateway {
  /** Devuelve el id del evento creado. */
  createEvent(refreshToken: string, draft: CalendarEventDraft): Promise<string>;
  deleteEvent(refreshToken: string, eventId: string): Promise<void>;
}
