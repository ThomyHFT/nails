import { sql } from "drizzle-orm";
import { boolean, date, pgTable, smallint, text, time, uuid } from "drizzle-orm/pg-core";
import { exceptionKindEnum } from "@/server/infrastructure/db/schema/enums";
import { professionals } from "@/server/infrastructure/db/schema/users";

export const availabilityRules = pgTable("availability_rules", {
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
});

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
