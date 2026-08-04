import { describe, expect, it } from "vitest";
import { VERTICALS, verticalCopy, verticalModules } from "@/server/domain/tenant/vertical";

describe("verticalModules", () => {
  it("solo uñas tiene diseñador", () => {
    expect(verticalModules("nails").designer).toBe(true);
    expect(verticalModules("barbershop").designer).toBe(false);
    expect(verticalModules("wellness").designer).toBe(false);
  });
});

describe("verticalCopy", () => {
  it("cada rubro tiene su propia etiqueta de eje", () => {
    expect(verticalCopy("nails").variantAxisLabel).toBe("Largo");
    expect(verticalCopy("barbershop").variantAxisLabel).toBe("Servicio");
    expect(verticalCopy("wellness").variantAxisLabel).toBe("Duración");
  });
});

describe("VERTICALS", () => {
  it("lista los tres rubros", () => {
    expect(VERTICALS.map((v) => v.value)).toEqual(["nails", "barbershop", "wellness"]);
  });
});
