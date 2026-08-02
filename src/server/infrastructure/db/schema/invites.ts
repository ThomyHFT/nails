import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { professionals } from "@/server/infrastructure/db/schema/users";

/**
 * Códigos de invitación para dar de alta profesionales.
 *
 * Un código, un uso: `usedByProfessionalId` queda en NULL hasta que alguien lo
 * canjea, y esa columna es a la vez el registro de quién lo usó. Se generan a
 * mano (`db:studio` o script) mientras el reclutamiento sea uno a uno; cuando
 * haga falta una UI para emitirlos, será su propio spec.
 */
export const inviteCodes = pgTable("invite_codes", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  /** Para qué o a quién se entregó. Solo para uso interno. */
  note: text("note"),
  usedByProfessionalId: uuid("used_by_professional_id").references(() => professionals.id),
  usedAt: timestamp("used_at", { withTimezone: true }),
  /** NULL = no vence. */
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
