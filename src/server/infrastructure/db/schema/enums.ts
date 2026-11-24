import { pgEnum } from "drizzle-orm/pg-core";

// "staff": integrante de un salón con acceso limitado (SPEC 22).
export const userRoleEnum = pgEnum("user_role", ["client", "professional", "admin", "staff"]);

/** Plan del negocio (SPEC 22). Lo cambia el superadmin; no hay cobro en la app. */
export const planEnum = pgEnum("plan", ["solo", "salon"]);

export const verticalEnum = pgEnum("vertical", ["nails", "barbershop", "wellness"]);

export const nailLengthEnum = pgEnum("nail_length", ["short", "medium", "long", "single"]);

export const exceptionKindEnum = pgEnum("exception_kind", ["blocked", "extra"]);

export const elementCategoryEnum = pgEnum("element_category", [
  "color",
  "finish",
  "decoration",
  "technique",
]);

export const designSourceEnum = pgEnum("design_source", ["client", "template"]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

export const actorEnum = pgEnum("actor", ["client", "professional"]);

export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected"]);

export const brandArchetypeEnum = pgEnum("brand_archetype", [
  "minimal_nude",
  "glam",
  "editorial",
  "pastel_soft",
  "barber_classic",
  "urban_dark",
  "clinical_calm",
]);

export const brandFontPairEnum = pgEnum("brand_font_pair", [
  "playfair_jakarta",
  "cormorant_inter",
  "dmserif_outfit",
  "jakarta_solo",
  "fraunces_nunito",
  "oswald_inter",
  "outfit_solo",
]);

export const heroLayoutEnum = pgEnum("hero_layout", ["split", "stacked", "minimal"]);

export const emailNotificationTypeEnum = pgEnum("email_notification_type", [
  "confirmation",
  "cancellation",
  "pending",
  // SPEC 19
  "reschedule",
  "reminder",
  // SPEC 21
  "waitlist",
  "rebook",
]);

export const emailNotificationStatusEnum = pgEnum("email_notification_status", ["sent", "failed"]);

export const calendarConnectionStatusEnum = pgEnum("calendar_connection_status", ["active", "revoked"]);

/** Para qué sirve un código enviado por correo (SPEC 20). */
export const emailCodePurposeEnum = pgEnum("email_code_purpose", ["login", "change_email"]);
