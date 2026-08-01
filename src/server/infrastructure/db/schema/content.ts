import { sql } from "drizzle-orm";
import { boolean, check, integer, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { reviewStatusEnum } from "@/server/infrastructure/db/schema/enums";
import { designs } from "@/server/infrastructure/db/schema/designs";
import { services } from "@/server/infrastructure/db/schema/services";
import { bookings } from "@/server/infrastructure/db/schema/bookings";
import { professionals, users } from "@/server/infrastructure/db/schema/users";

export const portfolioItems = pgTable("portfolio_items", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  professionalId: uuid("professional_id")
    .notNull()
    .references(() => professionals.id),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  serviceId: uuid("service_id").references(() => services.id),
  designId: uuid("design_id").references(() => designs.id),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id),
    bookingId: uuid("booking_id")
      .notNull()
      .unique()
      .references(() => bookings.id),
    clientUserId: uuid("client_user_id")
      .notNull()
      .references(() => users.id),
    rating: smallint("rating").notNull(),
    body: text("body").notNull(),
    photoUrl: text("photo_url"),
    status: reviewStatusEnum("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    authorInstagram: text("author_instagram"),
  },
  (table) => [check("reviews_rating_between_1_and_5", sql`${table.rating} BETWEEN 1 AND 5`)],
);
