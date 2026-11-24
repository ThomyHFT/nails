ALTER TYPE "public"."email_notification_type" ADD VALUE 'waitlist';--> statement-breakpoint
ALTER TYPE "public"."email_notification_type" ADD VALUE 'rebook';--> statement-breakpoint
CREATE TABLE "client_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"client_user_id" uuid NOT NULL,
	"package_id" uuid,
	"service_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sessions_total" integer NOT NULL,
	"price_clp" integer NOT NULL,
	"sold_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_packages_sessions_positive" CHECK ("client_packages"."sessions_total" > 0)
);
--> statement-breakpoint
CREATE TABLE "gift_card_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gift_card_id" uuid NOT NULL,
	"amount_clp" integer NOT NULL,
	"booking_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_card_redemptions_amount_positive" CHECK ("gift_card_redemptions"."amount_clp" > 0)
);
--> statement-breakpoint
CREATE TABLE "gift_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"code" text NOT NULL,
	"amount_clp" integer NOT NULL,
	"buyer_name" text NOT NULL,
	"recipient_name" text NOT NULL,
	"message" text,
	"expires_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_cards_code_unique" UNIQUE("code"),
	CONSTRAINT "gift_cards_amount_positive" CHECK ("gift_cards"."amount_clp" > 0)
);
--> statement-breakpoint
CREATE TABLE "package_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_package_id" uuid NOT NULL,
	"booking_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sessions" integer NOT NULL,
	"price_clp" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "packages_sessions_positive" CHECK ("packages"."sessions" > 0),
	CONSTRAINT "packages_price_non_negative" CHECK ("packages"."price_clp" >= 0)
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"client_user_id" uuid NOT NULL,
	"service_variant_id" uuid NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "deposit_clp" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "deposit_paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "rebook_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "deposit_clp" integer;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "bank_details" jsonb;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "rebook_after_days" integer;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "gift_cards_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_client_user_id_users_id_fk" FOREIGN KEY ("client_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_redemptions" ADD CONSTRAINT "gift_card_redemptions_gift_card_id_gift_cards_id_fk" FOREIGN KEY ("gift_card_id") REFERENCES "public"."gift_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_redemptions" ADD CONSTRAINT "gift_card_redemptions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_redemptions" ADD CONSTRAINT "package_redemptions_client_package_id_client_packages_id_fk" FOREIGN KEY ("client_package_id") REFERENCES "public"."client_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_redemptions" ADD CONSTRAINT "package_redemptions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_client_user_id_users_id_fk" FOREIGN KEY ("client_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_service_variant_id_service_variants_id_fk" FOREIGN KEY ("service_variant_id") REFERENCES "public"."service_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_packages_professional_client_idx" ON "client_packages" USING btree ("professional_id","client_user_id");--> statement-breakpoint
CREATE INDEX "gift_card_redemptions_gift_card_idx" ON "gift_card_redemptions" USING btree ("gift_card_id");--> statement-breakpoint
CREATE INDEX "gift_cards_professional_idx" ON "gift_cards" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "package_redemptions_client_package_idx" ON "package_redemptions" USING btree ("client_package_id");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_entries_professional_client_date_idx" ON "waitlist_entries" USING btree ("professional_id","client_user_id","date");--> statement-breakpoint
CREATE INDEX "waitlist_entries_professional_date_idx" ON "waitlist_entries" USING btree ("professional_id","date");