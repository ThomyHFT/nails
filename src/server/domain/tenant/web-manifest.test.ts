import { describe, expect, it } from "vitest";
import { buildWebManifest, iconInitial, shortName } from "@/server/domain/tenant/web-manifest";

const base = { slug: "fran", businessName: "Fran Uñas Studio", themeColor: "#72564c", backgroundColor: "#fff8f5" };

describe("web manifest (SPEC 20)", () => {
  it("opens the public site, with the start_url inside the scope", () => {
    const manifest = buildWebManifest({ ...base, kind: "public", description: "Uñas en Ñuñoa" });
    expect(manifest).toMatchObject({
      id: "/fran",
      name: "Fran Uñas Studio",
      short_name: "Fran",
      start_url: "/fran",
      scope: "/fran",
      description: "Uñas en Ñuñoa",
      theme_color: "#72564c",
      display: "standalone",
    });
    expect(manifest.icons.map((i) => i.purpose)).toEqual(["any", "any", "maskable"]);
  });

  it("opens the panel with its own id, so both can be installed", () => {
    const manifest = buildWebManifest({ ...base, kind: "panel" });
    expect(manifest).toMatchObject({ id: "/fran/admin", start_url: "/fran/admin", scope: "/fran/admin", short_name: "Mi panel" });
    expect(manifest.name).toBe("Panel · Fran Uñas Studio");
  });

  it("shortens long names for the home screen", () => {
    expect(shortName("Ana")).toBe("Ana");
    expect(shortName("Oceanails Estudio")).toBe("Oceanails");
    expect(shortName("Supercalifragilístico Nails")).toBe("Supercalifr…");
  });

  it("uses the first letter or digit for the icon", () => {
    expect(iconInitial("  ñandú nails")).toBe("Ñ");
    expect(iconInitial("24/7 Nails")).toBe("2");
    expect(iconInitial("¡¡!!")).toBe("•");
  });
});
