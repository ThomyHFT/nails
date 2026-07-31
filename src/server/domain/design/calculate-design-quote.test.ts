import { describe, expect, it } from "vitest";
import { calculateDesignQuote, InvalidDesignElementError } from "@/server/domain/design/calculate-design-quote";
import type { DesignElement } from "@/server/domain/design/design-element.entity";
import type { NailDesignPayload } from "@/server/domain/design/nail-design-payload";

const PROFESSIONAL_ID = "prof-1";

function element(overrides: Partial<DesignElement> & Pick<DesignElement, "category" | "code">): DesignElement {
  return {
    id: `elem-${overrides.code}`,
    professionalId: PROFESSIONAL_ID,
    label: overrides.code,
    colorHex: null,
    priceDeltaClp: 0,
    extraMinutes: 0,
    sortOrder: 0,
    active: true,
    ...overrides,
  };
}

function payloadWithSameNailOnAll(nail: NailDesignPayload["nails"][number]): NailDesignPayload {
  return {
    version: 2,
    shape: "almond",
    technique: null,
    nails: Array.from({ length: 10 }, () => ({ ...nail, decorations: [...nail.decorations] })),
  };
}

describe("calculateDesignQuote", () => {
  it("charges color, finish and decoration deltas once per nail", () => {
    const catalog = [
      element({ category: "color", code: "red", priceDeltaClp: 500, extraMinutes: 1 }),
      element({ category: "finish", code: "matte", priceDeltaClp: 300, extraMinutes: 2 }),
      element({ category: "decoration", code: "glitter", priceDeltaClp: 1_500, extraMinutes: 5 }),
    ];
    const payload = payloadWithSameNailOnAll({
      baseColorCode: "red",
      baseColorHex: "#FF0000",
      finish: "matte",
      decorations: ["glitter"],
    });

    const quote = calculateDesignQuote(payload, catalog);

    expect(quote.extraPriceClp).toBe((500 + 300 + 1_500) * 10);
    expect(quote.extraMinutes).toBe((1 + 2 + 5) * 10);
  });

  it("charges the technique delta once per design regardless of nail count", () => {
    const catalog = [
      element({ category: "color", code: "red", priceDeltaClp: 0 }),
      element({ category: "finish", code: "gloss", priceDeltaClp: 0 }),
      element({ category: "technique", code: "ombre", priceDeltaClp: 4_000, extraMinutes: 20 }),
    ];
    const payload: NailDesignPayload = {
      ...payloadWithSameNailOnAll({
        baseColorCode: "red",
        baseColorHex: "#FF0000",
        finish: "gloss",
        decorations: [],
      }),
      technique: "ombre",
    };

    const quote = calculateDesignQuote(payload, catalog);

    expect(quote.extraPriceClp).toBe(4_000);
    expect(quote.extraMinutes).toBe(20);
  });

  it("throws when a code does not exist in the catalog", () => {
    const catalog = [
      element({ category: "color", code: "red" }),
      element({ category: "finish", code: "gloss" }),
    ];
    const payload = payloadWithSameNailOnAll({
      baseColorCode: "red",
      baseColorHex: "#FF0000",
      finish: "gloss",
      decorations: ["nonexistent"],
    });

    expect(() => calculateDesignQuote(payload, catalog)).toThrow(InvalidDesignElementError);
  });

  it("throws when a code exists but is inactive", () => {
    const catalog = [
      element({ category: "color", code: "red", active: false }),
      element({ category: "finish", code: "gloss" }),
    ];
    const payload = payloadWithSameNailOnAll({
      baseColorCode: "red",
      baseColorHex: "#FF0000",
      finish: "gloss",
      decorations: [],
    });

    expect(() => calculateDesignQuote(payload, catalog)).toThrow(InvalidDesignElementError);
  });
});
