export type NailLength = "short" | "medium" | "long" | "single";

export interface ServiceVariant {
  id: string;
  serviceId: string;
  nailLength: NailLength;
  priceClp: number;
  durationMinutes: number;
  active: boolean;
}
