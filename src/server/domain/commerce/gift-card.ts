/** Gift card emitida por la profesional después de recibir el pago (SPEC 21). */
export interface GiftCard {
  id: string;
  professionalId: string;
  /** Forma canónica `ABCD-EF23GH`. */
  code: string;
  amountClp: number;
  /** Lo que queda: monto − cobros. */
  balanceClp: number;
  buyerName: string;
  recipientName: string;
  message: string | null;
  expiresAt: Date | null;
  voidedAt: Date | null;
  /** Hubo al menos un cobro: ya no se puede anular. */
  hasRedemptions: boolean;
  createdAt: Date;
}

export interface NewGiftCard {
  professionalId: string;
  code: string;
  amountClp: number;
  buyerName: string;
  recipientName: string;
  message: string | null;
  expiresAt: Date | null;
}

export type GiftCardState = "active" | "used" | "expired" | "voided";

/** Sin 0/O, 1/I/L: el código se dicta por teléfono o se copia de una foto. */
export const GIFT_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const GIFT_CODE_LENGTH = 10;
export const MIN_GIFT_CARD_CLP = 1000;
export const MAX_GIFT_CARD_CLP = 1_000_000;
export const MAX_GIFT_NAME = 80;
export const MAX_GIFT_MESSAGE = 300;

/** `indices` son enteros en [0, alfabeto). El llamador los genera con aleatoriedad criptográfica. */
export function giftCodeFromIndices(indices: number[]): string {
  const chars = indices.slice(0, GIFT_CODE_LENGTH).map((i) => GIFT_CODE_ALPHABET[i]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

/** Lo que escribió alguien (minúsculas, espacios, sin guion) a la forma canónica, o `null` si no puede ser un código. */
export function normalizeGiftCode(input: string): string | null {
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length !== GIFT_CODE_LENGTH) return null;
  if ([...clean].some((c) => !GIFT_CODE_ALPHABET.includes(c))) return null;
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}

export function giftCardState(card: GiftCard, now: Date = new Date()): GiftCardState {
  if (card.voidedAt) return "voided";
  if (card.balanceClp <= 0) return "used";
  if (card.expiresAt && card.expiresAt.getTime() <= now.getTime()) return "expired";
  return "active";
}

export interface GiftCardRepository {
  create(card: NewGiftCard): Promise<GiftCard>;
  listByProfessional(professionalId: string): Promise<GiftCard[]>;
  findById(id: string, professionalId: string): Promise<GiftCard | null>;
  findByCode(code: string): Promise<GiftCard | null>;
  /** Descuenta solo si alcanza el saldo y no está anulada (escritura condicional). */
  redeem(id: string, amountClp: number, bookingId: string | null): Promise<boolean>;
  /** Anula solo si nunca se cobró. */
  voidCard(id: string, professionalId: string): Promise<boolean>;
}
