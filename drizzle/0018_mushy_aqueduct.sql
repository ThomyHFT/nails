ALTER TABLE "service_variants" ADD COLUMN "label" text;--> statement-breakpoint
-- SPEC 13 fase 2, paso 2: backfill desde el enum legado. A partir de acá el
-- código deja de leer nail_length; solo lo sigue escribiendo (paso 3) hasta
-- que el paso 4 lo dropee.
UPDATE "service_variants" SET "label" = CASE "nail_length"
  WHEN 'short' THEN 'Corta'
  WHEN 'medium' THEN 'Media'
  WHEN 'long' THEN 'Larga'
  WHEN 'single' THEN 'Única'
END
WHERE "label" IS NULL;