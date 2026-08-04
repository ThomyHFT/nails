/**
 * `label` es texto libre puesto por la profesional: "Corta"/"Media"/"Larga"
 * en uñas, "Única" en barbería, "60 min"/"90 min" en masaje. El eje que
 * describe qué representa (`variantAxisLabel`) es del rubro; el valor
 * concreto de cada variante es de quien lo escribe.
 */
export interface ServiceVariant {
  id: string;
  serviceId: string;
  label: string;
  priceClp: number;
  durationMinutes: number;
  active: boolean;
}
