import type { ServiceVariant } from "@/server/domain/service/service-variant.entity";

export function priceFromClp(variants: ServiceVariant[]): number | null {
  const activePrices = variants.filter((v) => v.active).map((v) => v.priceClp);
  if (activePrices.length === 0) return null;
  return Math.min(...activePrices);
}
