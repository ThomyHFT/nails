/**
 * Escape para valores que entran al HTML de los correos. El nombre de la
 * clienta, el nombre del negocio y las URLs los escribe un usuario: sin esto,
 * alguien podía registrarse con un nombre que fuera un `<a href>` y hacerle
 * llegar un enlace de phishing a la profesional desde nuestro remitente.
 *
 * El asunto del correo es texto plano, no HTML: no se escapa.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Solo http(s): un `javascript:` o `data:` en un href o src se descarta. */
export function safeUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return escapeHtml(url.toString());
  } catch {
    return null;
  }
}

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** El color va dentro de un atributo `style`: cualquier cosa que no sea #RRGGBB cae al color por defecto. */
export function safeColor(value: string | null, fallback: string): string {
  return value && HEX_COLOR.test(value) ? value : fallback;
}
