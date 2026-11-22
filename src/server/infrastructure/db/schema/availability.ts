import { sql } from "drizzle-orm";
import { boolean, date, pgTable, smallint, text, time, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { exceptionKindEnum } from "@/server/infrastructure/db/schema/enums";
import { professionals } from "@/server/infrastructure/db/schema/users";

export const availabilityRules = pgTable(
  "availability_rules",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id),
    weekday: smallint("weekday").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    active: boolean("active").notNull().default(true),
    // NULL = horario semanal, se repite todos los meses (SPEC 18). Con fecha
    // es una excepción que reemplaza al semanal en ese mes completo.
    effectiveMonth: date("effective_month"),
  },
  (table) => [
    uniqueIndex("availability_rules_professional_weekday_month_idx").on(
      table.professionalId,
      table.weekday,
      table.effectiveMonth,
    ),
    // El índice de arriba no frena duplicados con NULL (en Postgres NULL <> NULL).
    uniqueIndex("availability_rules_professional_weekday_weekly_idx")
      .on(table.professionalId, table.weekday)
      .where(sql`${table.effectiveMonth} is null`),
  ],
);

export const availabilityExceptions = pgTable("availability_exceptions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  professionalId: uuid("professional_id")
    .notNull()
    .references(() => professionals.id),
  date: date("date").notNull(),
  kind: exceptionKindEnum("kind").notNull(),
  startTime: time("start_time"),
  endTime: time("end_time"),
  note: text("note"),
});
