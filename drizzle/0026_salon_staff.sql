CREATE TYPE "public"."plan" AS ENUM('solo', 'salon');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'staff';--> statement-breakpoint
CREATE TABLE "staff_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"all_services" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_members_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "staff_services" (
	"staff_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	CONSTRAINT "staff_services_staff_id_service_id_pk" PRIMARY KEY("staff_id","service_id")
);
--> statement-breakpoint
DROP INDEX "availability_rules_professional_weekday_month_idx";--> statement-breakpoint
DROP INDEX "availability_rules_professional_weekday_weekly_idx";--> statement-breakpoint
ALTER TABLE "availability_exceptions" ADD COLUMN "staff_id" uuid;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD COLUMN "staff_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "staff_id" uuid;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "plan" "plan" DEFAULT 'solo' NOT NULL;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "staff_limit" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
-- SPEC 22, backfill: cada negocio existente recibe su integrante dueña y todo
-- su horario, bloqueos y reservas pasan a ser de ella.
INSERT INTO "staff_members" ("professional_id", "user_id", "name", "is_owner")
SELECT p."id", p."owner_user_id", u."name", true
FROM "professionals" p JOIN "users" u ON u."id" = p."owner_user_id";--> statement-breakpoint
UPDATE "availability_rules" r SET "staff_id" = s."id" FROM "staff_members" s
WHERE s."professional_id" = r."professional_id" AND s."is_owner";--> statement-breakpoint
UPDATE "availability_exceptions" e SET "staff_id" = s."id" FROM "staff_members" s
WHERE s."professional_id" = e."professional_id" AND s."is_owner";--> statement-breakpoint
UPDATE "bookings" b SET "staff_id" = s."id" FROM "staff_members" s
WHERE s."professional_id" = b."professional_id" AND s."is_owner";--> statement-breakpoint
ALTER TABLE "availability_rules" ALTER COLUMN "staff_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "availability_exceptions" ALTER COLUMN "staff_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "staff_id" SET NOT NULL;--> statement-breakpoint
-- El solape pasa a ser por integrante: dos pueden atender a la misma hora.
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_no_overlap";--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap" EXCLUDE USING gist ("staff_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&) WHERE ("status" IN ('pending', 'confirmed'));--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_staff_id_staff_members_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_members_one_owner_idx" ON "staff_members" USING btree ("professional_id") WHERE "staff_members"."is_owner";--> statement-breakpoint
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_staff_id_staff_members_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_staff_id_staff_members_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_staff_id_staff_members_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "availability_rules_staff_weekday_month_idx" ON "availability_rules" USING btree ("staff_id","weekday","effective_month");--> statement-breakpoint
CREATE UNIQUE INDEX "availability_rules_staff_weekday_weekly_idx" ON "availability_rules" USING btree ("staff_id","weekday") WHERE "availability_rules"."effective_month" is null;--> statement-breakpoint
CREATE INDEX "bookings_staff_starts_idx" ON "bookings" USING btree ("staff_id","starts_at");
