export type NailDesignPayload = {
  version: 2;
  shape: "almond" | "coffin" | "square" | "round" | "stiletto";
  technique: string | null; // design_elements.code, categoría 'technique'
  // Exactamente 10 entradas.
  // Índices 0–4: mano izquierda, del pulgar al meñique.
  // Índices 5–9: mano derecha, del pulgar al meñique.
  nails: {
    baseColorCode: string; // design_elements.code, categoría 'color'
    baseColorHex: string; // '#RRGGBB', copiado del catálogo al guardar
    finish: string; // design_elements.code, categoría 'finish'
    decorations: string[]; // design_elements.code, categoría 'decoration'
  }[];
};
