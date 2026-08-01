import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { brandArchetypeEnum, brandFontPairEnum } from "@/server/infrastructure/db/schema/enums";
import { professionals } from "@/server/infrastructure/db/schema/users";

export const tenantBranding = pgTable("tenant_branding", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  professionalId: uuid("professional_id")
    .notNull()
    .unique()
    .references(() => professionals.id),
  archetype: brandArchetypeEnum("archetype").notNull().default("minimal_nude"),
  primaryColorHex: text("primary_color_hex"),
  onPrimaryColorHex: text("on_primary_color_hex"),
  fontPair: brandFontPairEnum("font_pair"),
  logoUrl: text("logo_url"),
  coverImageUrl: text("cover_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
