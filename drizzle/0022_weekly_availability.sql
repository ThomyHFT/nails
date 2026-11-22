-- SPEC 18: el horario se repite todos los meses. effective_month = NULL es el
-- horario semanal; una regla con mes reemplaza al semanal en ese mes.
ALTER TABLE "availability_rules" ALTER COLUMN "effective_month" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "availability_rules_professional_weekday_weekly_idx" ON "availability_rules" USING btree ("professional_id","weekday") WHERE "availability_rules"."effective_month" is null;--> statement-breakpoint
-- Backfill: las reglas del mes más reciente de cada profesional pasan a ser su
-- horario semanal, para que ningún sitio quede sin horas al desplegar.
INSERT INTO "availability_rules" ("professional_id", "weekday", "start_time", "end_time", "active", "effective_month")
SELECT r."professional_id", r."weekday", r."start_time", r."end_time", r."active", NULL
FROM "availability_rules" r
JOIN (
  SELECT "professional_id", max("effective_month") AS latest
  FROM "availability_rules"
  WHERE "effective_month" IS NOT NULL
  GROUP BY "professional_id"
) m ON m."professional_id" = r."professional_id" AND m.latest = r."effective_month";
