export class CalendarAccessRevokedError extends Error {
  constructor() {
    super("Google revocó el acceso al calendario");
    this.name = "CalendarAccessRevokedError";
  }
}
