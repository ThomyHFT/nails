import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";
import { escapeHtml, safeColor, safeUrl } from "@/server/domain/notification/html-escape";

/**
 * Código de 6 dígitos enviado por correo (SPEC 20): para entrar sin
 * contraseña (`login`) o para confirmar un correo nuevo (`change_email`).
 * En la base vive solo el hash.
 */
export type EmailCodePurpose = "login" | "change_email";

export const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
export const EMAIL_CODE_MAX_ATTEMPTS = 5;
export const EMAIL_CODE_RATE_WINDOW_MS = 15 * 60 * 1000;
export const EMAIL_CODE_MAX_PER_WINDOW = 3;

export interface EmailCode {
  id: string;
  email: string;
  purpose: EmailCodePurpose;
  userId: string | null;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface NewEmailCode {
  email: string;
  purpose: EmailCodePurpose;
  userId: string | null;
  codeHash: string;
  expiresAt: Date;
}

export interface EmailCodesRepository {
  create(code: NewEmailCode): Promise<EmailCode>;
  /** El último código sin consumir del correo para ese propósito (y usuario, si aplica). */
  findLatestActive(email: string, purpose: EmailCodePurpose, userId: string | null): Promise<EmailCode | null>;
  countCreatedSince(email: string, purpose: EmailCodePurpose, since: Date): Promise<number>;
  incrementAttempts(id: string): Promise<void>;
  /** Consume el código solo si nadie lo consumió antes; `true` si esta llamada ganó. */
  consume(id: string): Promise<boolean>;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Lo que se hashea: el código solo no basta, cualquier correo comparte el mismo espacio de 10^6. */
export function emailCodeHashInput(email: string, code: string): string {
  return `${normalizeEmail(email)}:${code}`;
}

export function buildEmailCodeEmail(input: {
  code: string;
  professionalName: string;
  branding: TenantBranding;
  purpose: EmailCodePurpose;
}): { subject: string; html: string } {
  const primaryColor = safeColor(input.branding.primaryColorHex, "#111111");
  const logo = safeUrl(input.branding.logoUrl);
  const action = input.purpose === "login" ? "entrar" : "confirmar tu nuevo correo";
  return {
    subject: `${input.code} es tu código para ${input.professionalName}`,
    html: `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
      ${logo ? `<img src="${logo}" alt="" width="120" style="display:block;margin-bottom:24px;" />` : ""}
      <h1 style="color:${primaryColor};font-size:20px;margin:0 0 16px;">Tu código</h1>
      <p>Usa este código para ${action} en <strong>${escapeHtml(input.professionalName)}</strong>:</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:bold;margin:24px 0;">${escapeHtml(input.code)}</p>
      <p>Vence en 10 minutos. Si no lo pediste, ignora este correo.</p>
    </div>
  `.trim(),
  };
}
