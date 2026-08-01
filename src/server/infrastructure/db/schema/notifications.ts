import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { emailNotificationStatusEnum, emailNotificationTypeEnum } from "@/server/infrastructure/db/schema/enums";
import { bookings } from "@/server/infrastructure/db/schema/bookings";
import { professionals } from "@/server/infrastructure/db/schema/users";

export const emailNotifications = pgTable("email_notifications", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  professionalId: uuid("professional_id")
    .notNull()
    .references(() => professionals.id),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id),
  type: emailNotificationTypeEnum("type").notNull(),
  status: emailNotificationStatusEnum("status").notNull(),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});
