/**
 * Rubro de un tenant.
 *
 * Vive en el tenant, no en el usuario ni en el servicio: una profesional es de
 * un rubro y sus servicios son texto libre dentro de él (SPEC 13). Es un enum
 * y no una tabla porque un rubro nuevo trae catálogo por defecto, vocabulario
 * y decisiones de módulos — todo eso es código, no data que se agregue desde
 * `db:studio`.
 */
export type Vertical = "nails" | "barbershop" | "wellness";

export const VERTICALS: { value: Vertical; label: string }[] = [
  { value: "nails", label: "Uñas" },
  { value: "barbershop", label: "Barbería" },
  { value: "wellness", label: "Masaje y podología" },
];

export interface VerticalModules {
  /** Si el rubro tiene diseñador (catálogo de `design_elements`, paso "Diseño" en /reservar). */
  designer: boolean;
}

/**
 * Qué módulos tiene un rubro. Devuelve un objeto y no un booleano suelto
 * porque el segundo módulo opcional va a llegar, y cambiar la forma del
 * retorno después obliga a tocar cada sitio que lo consulta.
 */
export function verticalModules(vertical: Vertical): VerticalModules {
  return { designer: vertical === "nails" };
}

export interface VerticalCopy {
  label: string;
  /** Encabezado del eje de variantes de un servicio ("Largo", "Servicio", "Duración"). */
  variantAxisLabel: string;
}

/**
 * Vocabulario que de verdad cambia entre rubros. Textos como "Reservar hora"
 * u "Opiniones" son iguales en los tres y no se parametrizan acá: un
 * diccionario que traduce todo termina siendo un i18n casero.
 */
export function verticalCopy(vertical: Vertical): VerticalCopy {
  switch (vertical) {
    case "nails":
      return { label: "Uñas", variantAxisLabel: "Largo" };
    case "barbershop":
      return { label: "Barbería", variantAxisLabel: "Servicio" };
    case "wellness":
      return { label: "Masaje y podología", variantAxisLabel: "Duración" };
  }
}
