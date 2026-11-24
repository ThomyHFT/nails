import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import {
  CommerceConflictError,
  CommerceNotFoundError,
  CommerceValidationError,
  GiftCardsUseCase,
  PackagesUseCase,
} from "@/server/application/commerce/commerce.use-case";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import {
  DrizzleGiftCardRepository,
  DrizzlePackageRepository,
} from "@/server/infrastructure/repositories/drizzle-commerce.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";

export function packagesUseCase() {
  return new PackagesUseCase(new DrizzlePackageRepository(), new DrizzleServicesRepository(), new DrizzleBookingRepository());
}

export function giftCardsUseCase() {
  return new GiftCardsUseCase(new DrizzleGiftCardRepository(), (max) => randomInt(max));
}

/** Traduce los errores de paquetes y gift cards (SPEC 21) a respuestas HTTP; relanza el resto. */
export function commerceErrorResponse(err: unknown): NextResponse {
  if (err instanceof CommerceValidationError) return NextResponse.json({ error: err.message }, { status: 422 });
  if (err instanceof CommerceNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
  if (err instanceof CommerceConflictError) return NextResponse.json({ error: err.message }, { status: 409 });
  throw err;
}

export const unauthorized = () => NextResponse.json({ error: "No autorizado" }, { status: 401 });
export const invalid = () => NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
