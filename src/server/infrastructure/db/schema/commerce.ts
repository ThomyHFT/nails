import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { bookings } from "@/server/infrastructure/db/schema/bookings";
import { services, serviceVariants } from "@/server/infrastructure/db/schema/services";
import { professionals, users } from "@/server/infrastructure/db/schema/users";

/** Clienta que quiere hora un día sin horas libres (SPEC 21). Una por clienta, negocio y día. */
export const waitlistEntries = pgTable(
  "waitlist_entries",
  {
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
    date: date("date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("waitlist_entries_professional_client_date_idx").on(
      table.professionalId,
      table.clientUserId,
      table.date,
    ),
    index("waitlist_entries_professional_date_idx").on(table.professionalId, table.date),
  ],
);

/** Catálogo de paquetes: N sesiones de un servicio a un precio (SPEC 21). */
export const packages = pgTable(
  "packages",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
    name: text("name").notNull(),
    sessions: integer("sessions").notNull(),
    priceClp: integer("price_clp").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("packages_sessions_positive", sql`${table.sessions} > 0`),
    check("packages_price_non_negative", sql`${table.priceClp} >= 0`),
  ],
);

/**
 * Paquete vendido a una clienta. Fotografía del catálogo al vender: cambiar o
 * desactivar el paquete no cambia lo que la clienta ya compró.
 */
export const clientPackages = pgTable(
  "client_packages",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id),
    clientUserId: uuid("client_user_id")
      .notNull()
      .references(() => users.id),
    packageId: uuid("package_id").references(() => packages.id),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
    name: text("name").notNull(),
    sessionsTotal: integer("sessions_total").notNull(),
    priceClp: integer("price_clp").notNull(),
    soldAt: timestamp("sold_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("client_packages_sessions_positive", sql`${table.sessionsTotal} > 0`),
    index("client_packages_professional_client_idx").on(table.professionalId, table.clientUserId),
  ],
);

export const packageRedemptions = pgTable(
  "package_redemptions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    clientPackageId: uuid("client_package_id")
      .notNull()
      .references(() => clientPackages.id),
    bookingId: uuid("booking_id").references(() => bookings.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("package_redemptions_client_package_idx").on(table.clientPackageId)],
);

/** Gift card emitida por la profesional después de recibir el pago (SPEC 21). */
export const giftCards = pgTable(
  "gift_cards",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id),
    code: text("code").notNull().unique(),
    amountClp: integer("amount_clp").notNull(),
    buyerName: text("buyer_name").notNull(),
    recipientName: text("recipient_name").notNull(),
    message: text("message"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("gift_cards_amount_positive", sql`${table.amountClp} > 0`),
    index("gift_cards_professional_idx").on(table.professionalId),
  ],
);

export const giftCardRedemptions = pgTable(
  "gift_card_redemptions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    giftCardId: uuid("gift_card_id")
      .notNull()
      .references(() => giftCards.id),
    amountClp: integer("amount_clp").notNull(),
    bookingId: uuid("booking_id").references(() => bookings.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("gift_card_redemptions_amount_positive", sql`${table.amountClp} > 0`),
    index("gift_card_redemptions_gift_card_idx").on(table.giftCardId),
  ],
);
