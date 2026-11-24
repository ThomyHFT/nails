import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { services } from "@/server/infrastructure/db/schema/services";
import { professionals, users } from "@/server/infrastructure/db/schema/users";

/**
 * Integrante del equipo de un negocio (SPEC 22). Todo negocio tiene al menos
 * una, la dueña; con plan Salón puede tener más. El horario, los bloqueos y
 * las reservas son de una integrante.
 */
export const staffMembers = pgTable(
  "staff_members",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id),
    // NULL = sin acceso propio (solo un nombre con horario).
    userId: uuid("user_id")
      .unique()
      .references(() => users.id),
    name: text("name").notNull(),
    isOwner: boolean("is_owner").notNull().default(false),
    active: boolean("active").notNull().default(true),
    // false = solo los servicios de `staff_services`.
    allServices: boolean("all_services").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("staff_members_one_owner_idx")
      .on(table.professionalId)
      .where(sql`${table.isOwner}`),
  ],
);

export const staffServices = pgTable(
  "staff_services",
  {
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staffMembers.id),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
  },
  (table) => [primaryKey({ columns: [table.staffId, table.serviceId] })],
);
