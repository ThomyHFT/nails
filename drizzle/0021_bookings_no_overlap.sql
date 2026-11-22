-- Dos reservas activas (pending/confirmed) de la misma profesional no pueden
-- solaparse. Es la red de seguridad contra la carrera entre calcular slots e
-- insertar: neon-http no soporta transacciones interactivas. El buffer entre
-- reservas lo sigue aplicando la aplicación; esto solo impide el solape real.
-- Escrita a mano: drizzle-kit no sabe expresar EXCLUDE constraints.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap" EXCLUDE USING gist ("professional_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&) WHERE ("status" IN ('pending', 'confirmed'));
