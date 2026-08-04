import { describe, expect, it } from "vitest";
import { DEFAULT_SECTION_ORDER, resolveSectionOrder } from "@/server/domain/branding/portada-layout";

describe("resolveSectionOrder", () => {
  it("returns the default order for null", () => {
    expect(resolveSectionOrder(null)).toEqual(DEFAULT_SECTION_ORDER);
  });

  it("returns the default order for a non-array value", () => {
    expect(resolveSectionOrder({ galeria: true })).toEqual(DEFAULT_SECTION_ORDER);
  });

  it("keeps a valid custom order, galería first", () => {
    expect(resolveSectionOrder(["galeria", "servicios", "opiniones", "contacto"])).toEqual([
      "galeria",
      "servicios",
      "opiniones",
      "contacto",
    ]);
  });

  it("keeps a subset, dropping omitted sections", () => {
    expect(resolveSectionOrder(["servicios", "contacto"])).toEqual(["servicios", "contacto"]);
  });

  it("discards unknown keys", () => {
    expect(resolveSectionOrder(["servicios", "brujeria", "contacto"])).toEqual(["servicios", "contacto"]);
  });

  it("discards duplicates, keeping the first occurrence", () => {
    expect(resolveSectionOrder(["contacto", "servicios", "contacto"])).toEqual(["contacto", "servicios"]);
  });

  it("falls back to the default order when everything is invalid", () => {
    expect(resolveSectionOrder(["brujeria", 42, null])).toEqual(DEFAULT_SECTION_ORDER);
  });

  it("falls back to the default order for an empty array", () => {
    expect(resolveSectionOrder([])).toEqual(DEFAULT_SECTION_ORDER);
  });
});
