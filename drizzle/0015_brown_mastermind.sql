ALTER TABLE "professionals" ADD COLUMN "phone_visible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "address_visible" boolean DEFAULT true NOT NULL;