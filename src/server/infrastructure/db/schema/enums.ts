import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["client", "professional"]);

export const nailLengthEnum = pgEnum("nail_length", ["short", "medium", "long", "single"]);

export const exceptionKindEnum = pgEnum("exception_kind", ["blocked", "extra"]);

export const elementCategoryEnum = pgEnum("element_category", [
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
