export type ElementCategory = "color" | "finish" | "decoration" | "technique";

export interface DesignElement {
  id: string;
  professionalId: string;
  category: ElementCategory;
  code: string;
  label: string;
  colorHex: string | null;
  priceDeltaClp: number;
  extraMinutes: number;
  sortOrder: number;
  active: boolean;
}
