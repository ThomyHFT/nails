import { describe, expect, it } from "vitest";
import { defaultDesignElements, defaultServices } from "@/server/domain/tenant/default-catalog";
import { VERTICALS, verticalModules } from "@/server/domain/tenant/vertical";

const HEX = /^#[0-9a-f]{6}$/;

describe("defaultDesignElements", () => {
  const elements = defaultDesignElements("nails");

  it("ships colors, finishes and decorations", () => {
    const categories = new Set(elements.map((element) => element.category));
    expect(categories).toEqual(new Set(["color", "finish", "decoration"]));
  });

  it("ships enough colors for the designer to be usable", () => {
    // Sin colores el diseñador no puede armar un payload válido: buildPayload
    // exige color y acabado en las diez uñas.
    const colors = elements.filter((element) => element.category === "color");
    expect(colors.length).toBeGreaterThanOrEqual(8);
  });

  it("gives every color a valid hex", () => {
    const colors = elements.filter((element) => element.category === "color");
    for (const color of colors) {
      expect(color.colorHex, `${color.code} debe traer un hex válido`).toMatch(HEX);
    }
  });

  it("leaves colorHex null for anything that is not a color", () => {
    const others = elements.filter((element) => element.category !== "color");
    expect(others.every((element) => element.colorHex === null)).toBe(true);
  });

  it("uses unique codes per category", () => {
    for (const category of ["color", "finish", "decoration"] as const) {
      const codes = elements.filter((e) => e.category === category).map((e) => e.code);
      expect(new Set(codes).size, `códigos repetidos en ${category}`).toBe(codes.length);
    }
  });

  it("keeps a free glossy and matte finish", () => {
    // El acabado es obligatorio en cada uña: si todos costaran extra, no
    // habría forma de cotizar un diseño simple en cero.
    const free = elements.filter((e) => e.category === "finish" && e.priceDeltaClp === 0);
    expect(free.map((e) => e.code)).toEqual(expect.arrayContaining(["glossy", "matte"]));
  });

  it("never uses negative prices or minutes", () => {
    for (const element of elements) {
      expect(element.priceDeltaClp).toBeGreaterThanOrEqual(0);
      expect(element.extraMinutes).toBeGreaterThanOrEqual(0);
    }
  });

  it("numbers sortOrder from zero within each category", () => {
    for (const category of ["color", "finish", "decoration"] as const) {
      const orders = elements.filter((e) => e.category === category).map((e) => e.sortOrder);
      expect(orders).toEqual(orders.map((_, index) => index));
    }
  });

  it("is empty for verticals without a designer", () => {
    for (const { value } of VERTICALS) {
      if (verticalModules(value).designer) continue;
      expect(defaultDesignElements(value)).toEqual([]);
    }
  });
});

describe("defaultServices", () => {
  for (const { value, label } of VERTICALS) {
    describe(label, () => {
      const services = defaultServices(value);

      it("ships at least one service with variants", () => {
        expect(services.length).toBeGreaterThan(0);
        expect(services.every((service) => service.variants.length > 0)).toBe(true);
      });

      it("uses positive integers for price and duration", () => {
        for (const service of services) {
          for (const variant of service.variants) {
            expect(Number.isInteger(variant.priceClp)).toBe(true);
            expect(variant.priceClp).toBeGreaterThan(0);
            expect(Number.isInteger(variant.durationMinutes)).toBe(true);
            expect(variant.durationMinutes).toBeGreaterThan(0);
          }
        }
      });

      it("never repeats a nail length within a service", () => {
        // El esquema tiene un índice único (service_id, nail_length): un
        // duplicado reventaría la inserción del registro.
        for (const service of services) {
          const lengths = service.variants.map((variant) => variant.nailLength);
          expect(new Set(lengths).size, `largos repetidos en ${service.name}`).toBe(lengths.length);
        }
      });
    });
  }
});
