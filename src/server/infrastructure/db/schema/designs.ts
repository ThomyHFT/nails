import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { NailDesignPayload } from "@/server/domain/design/nail-design-payload";
import { designSourceEnum, elementCategoryEnum } from "@/server/infrastructure/db/schema/enums";
import { professionals, users } from "@/server/infrastructure/db/schema/users";

export const designElements = pgTable(
  "design_elements",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id),
    category: elementCategoryEnum("category").notNull(),
    code: text("code").notNull(),
    label: text("label").notNull(),
    colorHex: text("color_hex"),
    priceDeltaClp: integer("price_delta_clp").notNull().default(0),
    extraMinutes: integer("extra_minutes").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (table) => [uniqueIndex("design_elements_professional_id_code_idx").on(table.professionalId, table.code)],
);

export const designs = pgTable("designs", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  professionalId: uuid("professional_id")
    .notNull()
    .references(() => professionals.id),
  clientUserId: uuid("client_user_id").references(() => users.id),
  source: designSourceEnum("source").notNull(),
  name: text("name"),
  payload: jsonb("payload").notNull().$type<NailDesignPayload>(),
  extraPriceClp: integer("extra_price_clp").notNull(),
  extraMinutes: integer("extra_minutes").notNull(),
  referenceImageUrl: text("reference_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
