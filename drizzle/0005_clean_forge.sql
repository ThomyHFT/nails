ALTER TABLE "availability_rules" ADD COLUMN "effective_month" date NOT NULL;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "buffer_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "availability_rules_professional_weekday_month_idx" ON "availability_rules" USING btree ("professional_id","weekday","effective_month");