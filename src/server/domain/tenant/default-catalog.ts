import type { ElementCategory } from "@/server/domain/design/design-element.entity";
import { verticalModules, type Vertical } from "@/server/domain/tenant/vertical";

/**
 * Catálogo con el que arranca un tenant nuevo, por rubro (SPEC 13).
 *
 * Para uñas existe porque el diseñador no tolera un catálogo vacío: para
 * cotizar necesita color y acabado en las diez uñas, así que una cuenta sin
 * colores deja la función diferenciadora del producto inutilizable desde el
 * primer minuto. Para el resto de los rubros, sembrar un catálogo razonable
 * convierte la configuración inicial en "editar lo que ya está" en vez de
 * "crear todo desde cero" — el mismo criterio, sin diseñador de por medio.
 *
 * Son funciones puras que devuelven data sin ids ni `professionalId`: quien
 * inserta decide esos valores. Las consumen el registro de profesionales y
 * `scripts/seed.ts`, para que ambos produzcan exactamente el mismo punto de
 * partida.
 *
 * Los precios están en CLP y salen de tarifas corrientes en Chile para cada
 * rubro. Son un borrador para que la profesional los ajuste, no una
 * recomendación.
 */

export interface DefaultDesignElement {
  category: ElementCategory;
  code: string;
  label: string;
  colorHex: string | null;
  priceDeltaClp: number;
  extraMinutes: number;
  sortOrder: number;
}

export interface DefaultServiceVariant {
  label: string;
  priceClp: number;
  durationMinutes: number;
}

export interface DefaultService {
  name: string;
  sortOrder: number;
  variants: DefaultServiceVariant[];
}

/**
 * Paleta de arranque. Los códigos son semánticos y no un correlativo: si más
 * adelante la profesional reordena o borra colores, un `nude` sigue siendo
 * `nude` en los diseños ya guardados.
 */
const COLORS: { code: string; label: string; colorHex: string }[] = [
  { code: "nude", label: "Nude", colorHex: "#e3c4ae" },
  { code: "rosa-palo", label: "Rosa palo", colorHex: "#e8b4b8" },
  { code: "blanco", label: "Blanco", colorHex: "#f7f5f2" },
  { code: "negro", label: "Negro", colorHex: "#1c1a19" },
  { code: "rojo", label: "Rojo", colorHex: "#b3122a" },
  { code: "vino", label: "Vino", colorHex: "#6d1f33" },
  { code: "coral", label: "Coral", colorHex: "#f0705a" },
  { code: "lila", label: "Lila", colorHex: "#b49ad1" },
  { code: "celeste", label: "Celeste", colorHex: "#9dc6e0" },
  { code: "verde-agua", label: "Verde agua", colorHex: "#8fc9b6" },
  { code: "durazno", label: "Durazno", colorHex: "#f4c2a0" },
  { code: "chocolate", label: "Chocolate", colorHex: "#6b4530" },
];

const FINISHES: { code: string; label: string; priceDeltaClp: number }[] = [
  { code: "glossy", label: "Brillante", priceDeltaClp: 0 },
  { code: "matte", label: "Mate", priceDeltaClp: 0 },
  { code: "glitter", label: "Glitter", priceDeltaClp: 2000 },
];

const DECORATIONS: { code: string; label: string; priceDeltaClp: number; extraMinutes: number }[] = [
  { code: "french", label: "Francesa", priceDeltaClp: 3000, extraMinutes: 10 },
  { code: "ombre", label: "Degradé", priceDeltaClp: 5000, extraMinutes: 15 },
  { code: "rhinestones", label: "Pedrería", priceDeltaClp: 3000, extraMinutes: 10 },
  { code: "hand-art", label: "Diseño a mano alzada", priceDeltaClp: 6000, extraMinutes: 20 },
];

/**
 * Catálogo de diseño de arranque. `[]` para un rubro sin diseñador: no hay
 * nada que sembrar, y el aprovisionamiento se salta la inserción entera en
 * vez de insertar una lista vacía.
 */
export function defaultDesignElements(vertical: Vertical): DefaultDesignElement[] {
  if (!verticalModules(vertical).designer) {
    return [];
  }

  return [
    ...COLORS.map((color, index) => ({
      category: "color" as ElementCategory,
      code: color.code,
      label: color.label,
      colorHex: color.colorHex,
      priceDeltaClp: 0,
      extraMinutes: 0,
      sortOrder: index,
    })),
    ...FINISHES.map((finish, index) => ({
      category: "finish" as ElementCategory,
      code: finish.code,
      label: finish.label,
      colorHex: null,
      priceDeltaClp: finish.priceDeltaClp,
      extraMinutes: 0,
      sortOrder: index,
    })),
    ...DECORATIONS.map((decoration, index) => ({
      category: "decoration" as ElementCategory,
      code: decoration.code,
      label: decoration.label,
      colorHex: null,
      priceDeltaClp: decoration.priceDeltaClp,
      extraMinutes: decoration.extraMinutes,
      sortOrder: index,
    })),
  ];
}

const NAILS_SERVICES: DefaultService[] = [
  {
    name: "Manicure clásica",
    sortOrder: 0,
    variants: [
      { label: "Corta", priceClp: 12000, durationMinutes: 45 },
      { label: "Media", priceClp: 15000, durationMinutes: 60 },
      { label: "Larga", priceClp: 18000, durationMinutes: 75 },
    ],
  },
  {
    name: "Uñas acrílicas",
    sortOrder: 1,
    variants: [
      { label: "Corta", priceClp: 20000, durationMinutes: 90 },
      { label: "Media", priceClp: 25000, durationMinutes: 105 },
      { label: "Larga", priceClp: 30000, durationMinutes: 120 },
    ],
  },
  {
    name: "Retiro de esmalte",
    sortOrder: 2,
    variants: [{ label: "Única", priceClp: 5000, durationMinutes: 20 }],
  },
];

// Rubros sin eje de largo llevan un único variante por servicio: el nombre
// del servicio ya dice de qué se trata, la variante solo carga precio y
// duración.
const BARBERSHOP_SERVICES: DefaultService[] = [
  {
    name: "Corte",
    sortOrder: 0,
    variants: [{ label: "Única", priceClp: 8000, durationMinutes: 30 }],
  },
  {
    name: "Corte + barba",
    sortOrder: 1,
    variants: [{ label: "Única", priceClp: 12000, durationMinutes: 45 }],
  },
  {
    name: "Barba",
    sortOrder: 2,
    variants: [{ label: "Única", priceClp: 6000, durationMinutes: 20 }],
  },
  {
    name: "Corte de niño",
    sortOrder: 3,
    variants: [{ label: "Única", priceClp: 7000, durationMinutes: 30 }],
  },
];

const WELLNESS_SERVICES: DefaultService[] = [
  {
    name: "Masaje descontracturante 60 min",
    sortOrder: 0,
    variants: [{ label: "Única", priceClp: 25000, durationMinutes: 60 }],
  },
  {
    name: "Masaje descontracturante 90 min",
    sortOrder: 1,
    variants: [{ label: "Única", priceClp: 35000, durationMinutes: 90 }],
  },
  {
    name: "Podología clínica",
    sortOrder: 2,
    variants: [{ label: "Única", priceClp: 20000, durationMinutes: 45 }],
  },
  {
    name: "Masaje relajante",
    sortOrder: 3,
    variants: [{ label: "Única", priceClp: 22000, durationMinutes: 50 }],
  },
];

export function defaultServices(vertical: Vertical): DefaultService[] {
  switch (vertical) {
    case "nails":
      return NAILS_SERVICES;
    case "barbershop":
      return BARBERSHOP_SERVICES;
    case "wellness":
      return WELLNESS_SERVICES;
  }
}
