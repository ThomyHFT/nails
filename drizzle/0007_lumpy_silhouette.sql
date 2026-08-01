CREATE TYPE "public"."brand_archetype" AS ENUM('minimal_nude', 'glam', 'editorial', 'pastel_soft');--> statement-breakpoint
CREATE TYPE "public"."brand_font_pair" AS ENUM('playfair_jakarta', 'cormorant_inter', 'dmserif_outfit', 'jakarta_solo', 'fraunces_nunito');--> statement-breakpoint
CREATE TABLE "tenant_branding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"archetype" "brand_archetype" DEFAULT 'minimal_nude' NOT NULL,
	"primary_color_hex" text,
	"on_primary_color_hex" text,
	"font_pair" "brand_font_pair",
	"logo_url" text,
	"cover_image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_branding_professional_id_unique" UNIQUE("professional_id")
);
--> statement-breakpoint
ALTER TABLE "tenant_branding" ADD CONSTRAINT "tenant_branding_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;