/**
 * Contacto de clientas (SPEC 18).
 *
 * El teléfono se guarda como lo escribe la persona (con +56, espacios o
 * guiones): es para mostrarlo y para armar el enlace wa.me, que limpia los
 * caracteres por su cuenta. Lo único que se exige es que tenga entre 8 y 15
 * dígitos, el rango de un número local o internacional (E.164).
 */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export function normalizePhone(phone: string): string {
  return phone.trim().replace(/\s+/g, " ");
}

/**
 * Hash imposible de verificar: bcrypt nunca produce "!", así que ninguna
 * contraseña coincide. Es la marca de una clienta creada por la profesional
 * (reserva manual) que todavía no activó su cuenta.
 */
export const UNUSABLE_PASSWORD_HASH = "!";

/**
 * Las clientas agendadas a mano sin correo reciben una dirección de relleno
 * en el TLD reservado `.invalid` (RFC 2606): nunca resuelve, y además ningún
 * correo sale hacia ella (`isPlaceholderEmail`).
 */
const PLACEHOLDER_DOMAIN = "agenda.invalid";

export function placeholderEmail(id: string): string {
  return `sin-correo+${id}@${PLACEHOLDER_DOMAIN}`;
}

export function isPlaceholderEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${PLACEHOLDER_DOMAIN}`);
}

/** Enlace de chat de WhatsApp: wa.me solo acepta dígitos (sin +, espacios ni guiones). */
export function whatsAppLink(phone: string): string {
  return `https://wa.me/${phone.replace(/[^0-9]/g, "")}`;
}
