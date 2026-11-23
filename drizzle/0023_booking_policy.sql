-- SPEC 19: reglas de reserva por profesional, recordatorio del día antes y aviso de reagendamiento.
ALTER TYPE "public"."email_notification_type" ADD VALUE 'reschedule';--> statement-breakpoint
ALTER TYPE "public"."email_notification_type" ADD VALUE 'reminder';--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "auto_confirm" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "slot_interval_minutes" integer;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "min_lead_minutes" integer DEFAULT 120 NOT NULL;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "max_advance_days" integer;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "cancellation_deadline_hours" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "reminder_sent_at" timestamp with time zone;
