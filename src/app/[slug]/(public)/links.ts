/**
 * Enlaces externos del micrositio. Viven acá y no en cada página porque el
 * handle de Instagram y el teléfono se usan en la landing, en el pie y en el
 * bloque de contacto, y cada copia era una forma distinta de normalizarlos.
 */

export function instagramUrl(handle: string): string {
  const clean = handle.startsWith("@") ? handle.slice(1) : handle;
  return `https://instagram.com/${clean}`;
}

export function instagramLabel(handle: string): string {
  return handle.startsWith("@") ? handle : `@${handle}`;
}

/** wa.me solo acepta dígitos: cualquier `+`, espacio o guión rompe el enlace. */
export function whatsAppUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/[^0-9]/g, "")}`;
}

/**
 * Búsqueda de Google Maps por texto, no un pin de coordenadas: la dirección
 * es texto libre que la profesional escribe a mano, sin geocodificar. El
 * esquema `search/?api=1&query=` es el que Google documenta como estable
 * para este caso y abre la app en el teléfono si está instalada.
 */
export function googleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
