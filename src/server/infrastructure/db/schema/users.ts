import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { userRoleEnum, verticalEnum } from "@/server/infrastructure/db/schema/enums";

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: userRoleEnum("role").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Espejo de `password_reset_tokens`: en la base vive solo el hash, el token en
 * claro viaja únicamente en el enlace del correo. El TTL es más largo que el
 * de contraseña (24 h contra 60 min) porque verificar el correo no es urgente
 * y el mensaje puede quedar sepultado en la bandeja.
 */
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const professionals = pgTable("professionals", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  businessName: text("business_name").notNull(),
  // Default 'nails' porque los tenants que existen hoy son de uñas y esta
  // columna nace sin backfill (ver SPEC 13).
  vertical: verticalEnum("vertical").notNull().default("nails"),
  bio: text("bio"),
  tagline: text("tagline"),
  phone: text("phone"),
  phoneVisible: boolean("phone_visible").notNull().default(true),
  address: text("address"),
  addressVisible: boolean("address_visible").notNull().default(true),
  instagramHandle: text("instagram_handle"),
  timezone: text("timezone").notNull().default("America/Santiago"),
  active: boolean("active").notNull().default(true),
  // NULL mientras el correo no esté verificado: el micrositio no es público
  // hasta entonces.
  publishedAt: timestamp("published_at", { withTimezone: true }),
  // NULL = sin vencimiento (cuentas internas o ya pagadas).
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  bufferMinutes: integer("buffer_minutes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
