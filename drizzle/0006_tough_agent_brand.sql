ALTER TYPE "public"."element_category" ADD VALUE 'color' BEFORE 'finish';--> statement-breakpoint
ALTER TABLE "design_elements" ADD COLUMN "color_hex" text;