import { sql } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { emailCodePurposeEnum } from "@/server/infrastructure/db/schema/enums";
import { professionals, users } from "@/server/infrastructure/db/schema/users";

/**
 * Nota privada de la profesional sobre una clienta (SPEC 20): alergias,
 * preferencias, forma de las uñas. Una por par profesional-clienta.
 */
export const clientNotes = pgTable(
  "client_notes",
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
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("client_notes_professional_client_idx").on(table.professionalId, table.clientUserId)],
);

/**
 * Códigos de 6 dígitos por correo (SPEC 20). Van por correo y no por usuario:
 * para entrar, la cuenta puede no existir todavía. Solo se guarda el hash.
 */
export const emailCodes = pgTable(
  "email_codes",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: text("email").notNull(),
    purpose: emailCodePurposeEnum("purpose").notNull(),
    userId: uuid("user_id").references(() => users.id),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("email_codes_email_purpose_created_idx").on(table.email, table.purpose, table.createdAt)],
);
