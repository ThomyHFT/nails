export interface InviteCode {
  id: string;
  code: string;
  note: string | null;
  usedByProfessionalId: string | null;
  usedAt: Date | null;
  /** `null` = no vence. */
  expiresAt: Date | null;
  createdAt: Date;
}

export type InviteCodeRejection = "not_found" | "already_used" | "expired";

/**
 * Si un código sirve para registrarse. Devuelve el motivo del rechazo para que
 * el caso de uso decida qué contar hacia afuera — hoy los tres se reportan
 * igual, porque distinguir "ya usado" de "no existe" le confirma a un extraño
 * que el código existía.
 */
export function checkInviteCode(code: InviteCode | null, now: Date = new Date()): InviteCodeRejection | "ok" {
  if (!code) return "not_found";
  if (code.usedAt !== null || code.usedByProfessionalId !== null) return "already_used";
  if (code.expiresAt !== null && code.expiresAt <= now) return "expired";
  return "ok";
}

export type InviteCodeStatus = "available" | "used" | "expired";

/**
 * Estado de un código para el panel de superadmin. Distinto de
 * `checkInviteCode`: ese decide si un código sirve para registrarse (y oculta
 * a propósito si existe); este describe un código que el admin ya sabe que
 * existe, así que puede ser explícito.
 */
export function inviteCodeStatus(code: InviteCode, now: Date = new Date()): InviteCodeStatus {
  if (code.usedAt !== null || code.usedByProfessionalId !== null) return "used";
  if (code.expiresAt !== null && code.expiresAt <= now) return "expired";
  return "available";
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I: se leen en voz alta o se copian a mano

/**
 * Código de invitación legible: 8 caracteres, sin ambigüedad visual. Usa
 * `crypto.getRandomValues` (Web Crypto, disponible en Node y en el runtime de
 * Vercel) en vez de `Math.random()` porque es lo que da de alta una cuenta.
 */
export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}
