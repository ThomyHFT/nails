import { db } from "@/server/infrastructure/db/client";
import { emailNotifications } from "@/server/infrastructure/db/schema/notifications";
import type {
  EmailNotificationRepository,
  NewEmailNotification,
} from "@/server/domain/notification/email-notification-repository.port";

export class DrizzleEmailNotificationRepository implements EmailNotificationRepository {
  async create(input: NewEmailNotification): Promise<void> {
    await db.insert(emailNotifications).values({
      professionalId: input.professionalId,
      bookingId: input.bookingId,
      type: input.type,
      status: input.status,
      errorMessage: input.errorMessage,
    });
  }
}
