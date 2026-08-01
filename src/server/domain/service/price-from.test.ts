import { describe, expect, it } from "vitest";
import { priceFromClp } from "@/server/domain/service/price-from";
import type { ServiceVariant } from "@/server/domain/service/service-variant.entity";

function variant(overrides: Partial<ServiceVariant> = {}): ServiceVariant {
  return {
    id: "v1",
    serviceId: "s1",
    nailLength: "short",
    priceClp: 10_000,
    durationMinutes: 45,
    active: true,
    ...overrides,
  };
}

describe("priceFromClp", () => {
  it("returns the minimum price among active variants", () => {
    const variants = [
      variant({ id: "v1", priceClp: 15_000 }),
      variant({ id: "v2", priceClp: 10_000 }),
      variant({ id: "v3", priceClp: 20_000 }),
    ];

    expect(priceFromClp(variants)).toBe(10_000);
  });

  it("ignores inactive variants", () => {
    const variants = [
      variant({ id: "v1", priceClp: 5_000, active: false }),
      variant({ id: "v2", priceClp: 10_000, active: true }),
    ];

    expect(priceFromClp(variants)).toBe(10_000);
  });

  it("returns null when there are no active variants", () => {
    const variants = [
      variant({ id: "v1", active: false }),
      variant({ id: "v2", active: false }),
    ];

    expect(priceFromClp(variants)).toBeNull();
  });

  it("returns null for an empty variant list", () => {
    expect(priceFromClp([])).toBeNull();
  });
});
