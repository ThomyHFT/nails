export type PortadaSection = "servicios" | "galeria" | "opiniones" | "contacto";

export const DEFAULT_SECTION_ORDER: PortadaSection[] = ["servicios", "galeria", "opiniones", "contacto"];

const KNOWN_SECTIONS: readonly PortadaSection[] = DEFAULT_SECTION_ORDER;

export type HeroLayout = "split" | "stacked" | "minimal";

export const HERO_LAYOUTS: readonly HeroLayout[] = ["split", "stacked", "minimal"];

function isPortadaSection(value: unknown): value is PortadaSection {
  return typeof value === "string" && (KNOWN_SECTIONS as readonly string[]).includes(value);
}

/**
 * `stored` sale de una columna `jsonb`: nada garantiza que sea un array de
 * secciones válidas. Descarta claves desconocidas y duplicados; si el
 * resultado queda vacío, cae al orden por defecto en vez de dejar la portada
 * sin secciones.
 */
export function resolveSectionOrder(stored: unknown): PortadaSection[] {
  if (!Array.isArray(stored)) {
    return DEFAULT_SECTION_ORDER;
  }

  const seen = new Set<PortadaSection>();
  for (const item of stored) {
    if (isPortadaSection(item)) {
      seen.add(item);
    }
  }

  return seen.size > 0 ? Array.from(seen) : DEFAULT_SECTION_ORDER;
}
