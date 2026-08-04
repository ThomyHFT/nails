CREATE TYPE "public"."vertical" AS ENUM('nails', 'barbershop', 'wellness');--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "vertical" "vertical" DEFAULT 'nails' NOT NULL;