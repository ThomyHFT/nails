import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { actorEnum, bookingStatusEnum } from "@/server/infrastructure/db/schema/enums";
import { designs } from "@/server/infrastructure/db/schema/designs";
import { serviceVariants } from "@/server/infrastructure/db/schema/services";
import { professionals, users } from "@/server/infrastructure/db/schema/users";

export const bookings = pgTable("bookings", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  professionalId: uuid("professional_id")
    .notNull()
    .references(() => professionals.id),
  clientUserId: uuid("client_user_id")
    .notNull()
    .references(() => users.id),
  serviceVariantId: uuid("service_variant_id")
    .notNull()
    .references(() => serviceVariants.id),
  designId: uuid("design_id").references(() => designs.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: bookingStatusEnum("status").notNull(),
  priceClp: integer("price_clp").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  clientNote: text("client_note"),
  professionalNote: text("professional_note"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelledBy: actorEnum("cancelled_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
