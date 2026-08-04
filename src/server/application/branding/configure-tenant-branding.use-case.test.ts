import { describe, expect, it } from "vitest";
import { InMemoryBrandingRepository } from "@/server/application/branding/__fakes__/in-memory-branding-repository";
import {
  ConfigureTenantBrandingUseCase,
  InvalidArchetypeError,
  InvalidColorHexError,
  InvalidHeroLayoutError,
  InvalidImageUrlError,
  type ConfigureTenantBrandingInput,
} from "@/server/application/branding/configure-tenant-branding.use-case";
import { DEFAULT_SECTION_ORDER } from "@/server/domain/branding/portada-layout";

function input(overrides: Partial<ConfigureTenantBrandingInput> = {}): ConfigureTenantBrandingInput {
  return {
    professionalId: "prof-1",
    archetype: "minimal_nude",
    primaryColorHex: null,
    onPrimaryColorHex: null,
    fontPair: null,
    logoUrl: null,
    coverImageUrl: null,
    heroLayout: "split",
    sectionOrder: null,
    ...overrides,
  };
}

describe("ConfigureTenantBrandingUseCase", () => {
  it("rejects an invalid hex color", async () => {
    const useCase = new ConfigureTenantBrandingUseCase(new InMemoryBrandingRepository());

    await expect(useCase.execute(input({ primaryColorHex: "red" }))).rejects.toThrow(InvalidColorHexError);
  });

  it("rejects a logo URL without https scheme", async () => {
    const useCase = new ConfigureTenantBrandingUseCase(new InMemoryBrandingRepository());

    await expect(useCase.execute(input({ logoUrl: "http://example.com/logo.png" }))).rejects.toThrow(
      InvalidImageUrlError,
    );
  });

  it("rejects a URL without a scheme", async () => {
    const useCase = new ConfigureTenantBrandingUseCase(new InMemoryBrandingRepository());

    await expect(useCase.execute(input({ coverImageUrl: "example.com/cover.png" }))).rejects.toThrow(
      InvalidImageUrlError,
    );
  });

  it("rejects a non-existent archetype", async () => {
    const useCase = new ConfigureTenantBrandingUseCase(new InMemoryBrandingRepository());

    // @ts-expect-error probando un valor fuera del enum
    await expect(useCase.execute(input({ archetype: "does_not_exist" }))).rejects.toThrow(InvalidArchetypeError);
  });

  it("saves valid input and upserts a single row per professional", async () => {
    const repository = new InMemoryBrandingRepository();
    const useCase = new ConfigureTenantBrandingUseCase(repository);

    await useCase.execute(input({ primaryColorHex: "#123456" }));
    await useCase.execute(input({ primaryColorHex: "#654321" }));

    expect(repository.rows).toHaveLength(1);
    expect(repository.rows[0].primaryColorHex).toBe("#654321");
  });

  it("rejects a non-existent hero layout", async () => {
    const useCase = new ConfigureTenantBrandingUseCase(new InMemoryBrandingRepository());

    // @ts-expect-error probando un valor fuera del enum
    await expect(useCase.execute(input({ heroLayout: "background" }))).rejects.toThrow(InvalidHeroLayoutError);
  });

  it("sanitizes sectionOrder before saving, falling back to the default order when it is garbage", async () => {
    const repository = new InMemoryBrandingRepository();
    const useCase = new ConfigureTenantBrandingUseCase(repository);

    const saved = await useCase.execute(input({ sectionOrder: ["brujeria", "servicios", "servicios"] }));

    expect(saved.sectionOrder).toEqual(["servicios"]);
  });

  it("falls back to the default order when sectionOrder is null", async () => {
    const useCase = new ConfigureTenantBrandingUseCase(new InMemoryBrandingRepository());

    const saved = await useCase.execute(input({ sectionOrder: null }));

    expect(saved.sectionOrder).toEqual(DEFAULT_SECTION_ORDER);
  });
});
