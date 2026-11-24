import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { actorEnum, bookingStatusEnum } from "@/server/infrastructure/db/schema/enums";
import { designs } from "@/server/infrastructure/db/schema/designs";
import { serviceVariants } from "@/server/infrastructure/db/schema/services";
import { professionals, users } from "@/server/infrastructure/db/schema/users";

// Constraint `bookings_no_overlap` (EXCLUDE USING gist) vive solo en la
// migración 0021: Drizzle no sabe declararlo. Impide dos reservas activas
// solapadas de la misma profesional.
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
  googleEventId: text("google_event_id"),
  // Recordatorio del día antes ya enviado (SPEC 19). Se limpia al reagendar.
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  // Abono congelado al reservar y cuándo lo recibió la profesional (SPEC 21).
  depositClp: integer("deposit_clp"),
  depositPaidAt: timestamp("deposit_paid_at", { withTimezone: true }),
  // Correo "vuelve a reservar" ya enviado por esta reserva completada (SPEC 21).
  rebookSentAt: timestamp("rebook_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
