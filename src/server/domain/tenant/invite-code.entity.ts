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
