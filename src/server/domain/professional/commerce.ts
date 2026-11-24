/**
 * Lo que la profesional vende o cobra fuera de la reserva misma (SPEC 21):
 * abono por transferencia, "vuelve a reservar" y gift cards. Vive en
 * `professionals`, uno por tenant, como las reglas de reserva.
 */
export interface BankDetails {
  bank: string;
  accountType: string;
  accountNumber: string;
  holderName: string;
  holderRut: string;
  email: string;
}

export interface ProfessionalCommerce {
  /** Abono por reserva en CLP. `null` = sin abono. */
  depositClp: number | null;
  bankDetails: BankDetails | null;
  /** Días tras una completada para invitar a volver. `null` = apagado. */
  rebookAfterDays: number | null;
  giftCardsEnabled: boolean;
}

export const DEFAULT_PROFESSIONAL_COMMERCE: ProfessionalCommerce = {
  depositClp: null,
  bankDetails: null,
  rebookAfterDays: null,
  giftCardsEnabled: false,
};

export const MIN_DEPOSIT_CLP = 1000;
export const MAX_DEPOSIT_CLP = 500_000;
export const MIN_REBOOK_DAYS = 7;
export const MAX_REBOOK_DAYS = 120;

const BANK_FIELDS: (keyof BankDetails)[] = ["bank", "accountType", "accountNumber", "holderName", "holderRut", "email"];

/** Lee el jsonb de la base. Cualquier forma inesperada cuenta como "sin datos". */
export function parseBankDetails(value: unknown): BankDetails | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const out = {} as BankDetails;
  for (const field of BANK_FIELDS) {
    const v = record[field];
    if (typeof v !== "string") return null;
    out[field] = v;
  }
  return out;
}

export function isCompleteBankDetails(details: BankDetails | null): details is BankDetails {
  return details !== null && BANK_FIELDS.every((field) => details[field].trim().length > 0);
}

/**
 * El abono de una reserva: lo configurado, nunca más que el precio. `null` si
 * la profesional no cobra abono o le faltan los datos para recibirlo.
 */
export function depositForPrice(commerce: ProfessionalCommerce, priceClp: number): number | null {
  if (commerce.depositClp === null || commerce.depositClp <= 0) return null;
  if (!isCompleteBankDetails(commerce.bankDetails)) return null;
  const amount = Math.min(commerce.depositClp, priceClp);
  return amount > 0 ? amount : null;
}

/** Texto plano para copiar o mandar por WhatsApp. */
export function bankDetailsText(details: BankDetails): string {
  return [
    details.holderName,
    `RUT ${details.holderRut}`,
    details.bank,
    `${details.accountType} ${details.accountNumber}`,
    details.email,
  ].join("\n");
}
