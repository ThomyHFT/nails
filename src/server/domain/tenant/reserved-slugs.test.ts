import { describe, expect, it } from "vitest";
import { isReservedSlug, suggestSlug, validateSlug } from "@/server/domain/tenant/reserved-slugs";

describe("validateSlug", () => {
  it("accepts a plain slug", () => {
    expect(validateSlug("unas-por-karla")).toBe("ok");
  });

  it("accepts digits", () => {
    expect(validateSlug("nails2go")).toBe("ok");
  });

  it("rejects slugs shorter than the minimum", () => {
    expect(validateSlug("ab")).toBe("invalid_format");
  });

  it("rejects slugs longer than the maximum", () => {
    expect(validateSlug("a".repeat(31))).toBe("invalid_format");
  });

  it("rejects uppercase, spaces and accents", () => {
    expect(validateSlug("Unas Por Karla")).toBe("invalid_format");
    expect(validateSlug("uñas")).toBe("invalid_format");
  });

  it("rejects leading, trailing and doubled hyphens", () => {
    expect(validateSlug("-karla")).toBe("invalid_format");
    expect(validateSlug("karla-")).toBe("invalid_format");
    expect(validateSlug("karla--nails")).toBe("invalid_format");
  });

  it("rejects routes that already exist in the app", () => {
    // Regalar cualquiera de estas dejaría la ruta real inalcanzable.
    expect(validateSlug("api")).toBe("reserved");
    expect(validateSlug("admin")).toBe("reserved");
    expect(validateSlug("estilo")).toBe("reserved");
    expect(validateSlug("registro-profesional")).toBe("reserved");
  });

  it("rejects reserved slugs regardless of casing or padding", () => {
    expect(validateSlug("  API  ")).toBe("reserved");
  });

  it("rejects brand and generic slugs", () => {
    expect(validateSlug("misunas")).toBe("reserved");
    expect(validateSlug("soporte")).toBe("reserved");
  });
});

describe("isReservedSlug", () => {
  it("is case and whitespace insensitive", () => {
    expect(isReservedSlug("Admin")).toBe(true);
    expect(isReservedSlug(" api ")).toBe(true);
  });

  it("lets a normal business slug through", () => {
    expect(isReservedSlug("unas-por-karla")).toBe(false);
  });
});

describe("suggestSlug", () => {
  it("strips accents and lowercases", () => {
    expect(suggestSlug("Uñas por Karla")).toBe("unas-por-karla");
  });

  it("collapses punctuation and spaces into single hyphens", () => {
    expect(suggestSlug("Nails & Beauty  —  Studio")).toBe("nails-beauty-studio");
  });

  it("trims hyphens at both ends", () => {
    expect(suggestSlug("  ¡Glam Nails!  ")).toBe("glam-nails");
  });

  it("truncates without leaving a trailing hyphen", () => {
    const suggestion = suggestSlug("a".repeat(28) + " bb");
    expect(suggestion.length).toBeLessThanOrEqual(30);
    expect(suggestion.endsWith("-")).toBe(false);
  });

  it("produces a slug that validateSlug accepts", () => {
    expect(validateSlug(suggestSlug("Uñas por Karla"))).toBe("ok");
  });
});
