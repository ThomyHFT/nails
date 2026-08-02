/**
 * Validación del slug de un tenant.
 *
 * El slug es la URL del micrositio (`misunas.cl/<slug>`) y vive en la raíz del
 * router, así que compite con las rutas reales de la app: sin esta lista,
 * alguien podría registrarse como `api` o `admin` y dejar esas rutas
 * inalcanzables para todos.
 */

export const MIN_SLUG_LENGTH = 3;
export const MAX_SLUG_LENGTH = 30;

/** Minúsculas, números y guiones simples; sin guion al principio ni al final. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Rutas que ya existen en la app. Regalar cualquiera de estas rompe la
 * navegación para todos los tenants, no solo para el que la tomó.
 */
const APP_ROUTES = [
  "api",
  "admin",
  "estilo",
  "login",
  "registro",
  "registro-profesional",
  "recuperar",
  "verificar",
  "cuenta",
  "reservar",
  "servicios",
  "opiniones",
  "_next",
];

/** Marca del producto: no se regala aunque hoy no resuelvan a nada. */
const BRAND = ["misunas", "misunas-app", "app", "www"];

/** Genéricos que vamos a querer para el sitio del producto más adelante. */
const GENERIC = [
  "ayuda",
  "soporte",
  "help",
  "support",
  "blog",
  "about",
  "nosotros",
  "contacto",
  "precios",
  "planes",
  "terminos",
  "privacidad",
  "test",
  "demo",
  "null",
  "undefined",
];

const RESERVED = new Set([...APP_ROUTES, ...BRAND, ...GENERIC]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED.has(slug.trim().toLowerCase());
}

export type SlugValidity = "ok" | "invalid_format" | "reserved";

export function validateSlug(slug: string): SlugValidity {
  const normalized = slug.trim().toLowerCase();

  if (
    normalized.length < MIN_SLUG_LENGTH ||
    normalized.length > MAX_SLUG_LENGTH ||
    !SLUG_PATTERN.test(normalized)
  ) {
    return "invalid_format";
  }

  return isReservedSlug(normalized) ? "reserved" : "ok";
}

/**
 * Sugerencia de slug a partir del nombre del negocio ("Uñas por Karla" →
 * "unas-por-karla"). Es solo el punto de partida del campo: quien se registra
 * puede editarlo, y la validación real la hace `validateSlug`, así que esta
 * función no garantiza un resultado válido (un nombre de dos letras devuelve
 * un slug demasiado corto, y así debe reportarlo el formulario).
 */
export function suggestSlug(businessName: string): string {
  return businessName
    .normalize("NFD")
    // Diacríticos fuera, pero la ñ sobrevive como "n": "Uñas" → "unas", que es
    // lo que la gente escribe cuando busca el sitio.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
}
