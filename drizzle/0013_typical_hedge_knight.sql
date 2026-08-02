CREATE TABLE "invite_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"note" text,
	"used_by_professional_id" uuid,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invite_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_verification_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "trial_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_used_by_professional_id_professionals_id_fk" FOREIGN KEY ("used_by_professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Backfill: los tenants que ya existían estaban publicados de hecho. Sin esto,
-- la nueva regla de visibilidad (que exige published_at) los ocultaría a todos
-- apenas se despliegue el código.
UPDATE "professionals" SET "published_at" = now() WHERE "published_at" IS NULL;--> statement-breakpoint
-- Las cuentas anteriores a la verificación de correo se dan por verificadas:
-- no tuvieron nunca la oportunidad de verificarse, y sin esto verían un aviso
-- pidiéndoles verificar para publicar un sitio que ya está publicado.
UPDATE "users" SET "email_verified_at" = now() WHERE "email_verified_at" IS NULL;
