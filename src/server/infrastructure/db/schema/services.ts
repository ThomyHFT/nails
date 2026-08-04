import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { nailLengthEnum } from "@/server/infrastructure/db/schema/enums";
import { professionals } from "@/server/infrastructure/db/schema/users";

export const services = pgTable("services", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  professionalId: uuid("professional_id")
    .notNull()
    .references(() => professionals.id),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceVariants = pgTable(
  "service_variants",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
    // `nail_length` es el eje heredado, solo de uñas (enum de 4 valores).
    // `label` es el reemplazo genérico por rubro (SPEC 13 fase 2): texto
    // libre puesto por la profesional. Mientras dura la migración
    // expand/contract, se escriben los dos; nail_length ya no se lee.
    nailLength: nailLengthEnum("nail_length").notNull(),
    label: text("label"),
    priceClp: integer("price_clp").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    active: boolean("active").notNull().default(true),
  },
  (table) => [uniqueIndex("service_variants_service_id_nail_length_idx").on(table.serviceId, table.nailLength)],
);
