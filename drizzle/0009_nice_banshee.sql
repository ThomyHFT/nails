CREATE TYPE "public"."email_notification_status" AS ENUM('sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."email_notification_type" AS ENUM('confirmation', 'cancellation');--> statement-breakpoint
CREATE TABLE "email_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"type" "email_notification_type" NOT NULL,
	"status" "email_notification_status" NOT NULL,
	"error_message" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_notifications" ADD CONSTRAINT "email_notifications_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_notifications" ADD CONSTRAINT "email_notifications_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;