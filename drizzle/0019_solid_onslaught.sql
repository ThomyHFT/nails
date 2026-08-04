CREATE TYPE "public"."hero_layout" AS ENUM('split', 'stacked', 'minimal');--> statement-breakpoint
ALTER TYPE "public"."brand_archetype" ADD VALUE 'barber_classic';--> statement-breakpoint
ALTER TYPE "public"."brand_archetype" ADD VALUE 'urban_dark';--> statement-breakpoint
ALTER TYPE "public"."brand_archetype" ADD VALUE 'clinical_calm';--> statement-breakpoint
ALTER TYPE "public"."brand_font_pair" ADD VALUE 'oswald_inter';--> statement-breakpoint
ALTER TYPE "public"."brand_font_pair" ADD VALUE 'outfit_solo';--> statement-breakpoint
ALTER TABLE "tenant_branding" ADD COLUMN "hero_layout" "hero_layout" DEFAULT 'split' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_branding" ADD COLUMN "section_order" jsonb;