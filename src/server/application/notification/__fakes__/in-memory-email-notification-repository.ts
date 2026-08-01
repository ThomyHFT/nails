import type {
  EmailNotificationRepository,
  NewEmailNotification,
} from "@/server/domain/notification/email-notification-repository.port";

export class InMemoryEmailNotificationRepository implements EmailNotificationRepository {
  readonly rows: NewEmailNotification[] = [];

  async create(input: NewEmailNotification): Promise<void> {
    this.rows.push(input);
  }
}
