import { describe, expect, it } from "vitest";
import { InMemoryDesignRepository } from "@/server/application/design/__fakes__/in-memory-design-repository";
import {
  ConfigureDesignElementsUseCase,
  DesignElementNotFoundError,
  InvalidColorHexError,
} from "@/server/application/design/configure-design-elements.use-case";

const PROFESSIONAL_ID = "prof-1";

function makeUseCase() {
  const designRepository = new InMemoryDesignRepository();
  const useCase = new ConfigureDesignElementsUseCase(designRepository);
  return { useCase, designRepository };
}

describe("ConfigureDesignElementsUseCase", () => {
  it("creates a color element when color_hex has a valid #RRGGBB format", async () => {
    const { useCase } = makeUseCase();

    const element = await useCase.create({
      professionalId: PROFESSIONAL_ID,
      category: "color",
      code: "red",
      label: "Rojo",
      colorHex: "#FF0000",
    });

    expect(element.colorHex).toBe("#FF0000");
  });

  it("rejects creating a color element without color_hex", async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.create({
        professionalId: PROFESSIONAL_ID,
        category: "color",
        code: "red",
        label: "Rojo",
      }),
    ).rejects.toBeInstanceOf(InvalidColorHexError);
  });

  it("rejects creating a color element with a malformed color_hex", async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.create({
        professionalId: PROFESSIONAL_ID,
        category: "color",
        code: "red",
        label: "Rojo",
        colorHex: "not-a-hex",
      }),
    ).rejects.toBeInstanceOf(InvalidColorHexError);
  });

  it("rejects color_hex on a non-color category", async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.create({
        professionalId: PROFESSIONAL_ID,
        category: "finish",
        code: "matte",
        label: "Mate",
        colorHex: "#FF0000",
      }),
    ).rejects.toBeInstanceOf(InvalidColorHexError);
  });

  it("updates an existing element's price delta", async () => {
    const { useCase } = makeUseCase();
    const created = await useCase.create({
      professionalId: PROFESSIONAL_ID,
      category: "finish",
      code: "matte",
      label: "Mate",
      priceDeltaClp: 500,
    });

    const updated = await useCase.update({
      id: created.id,
      professionalId: PROFESSIONAL_ID,
      patch: { priceDeltaClp: 800 },
    });

    expect(updated.priceDeltaClp).toBe(800);
  });

  it("deactivates an element without deleting it", async () => {
    const { useCase, designRepository } = makeUseCase();
    const created = await useCase.create({
      professionalId: PROFESSIONAL_ID,
      category: "finish",
      code: "matte",
      label: "Mate",
    });

    await useCase.update({ id: created.id, professionalId: PROFESSIONAL_ID, patch: { active: false } });

    const activeOnly = await designRepository.listElementsByProfessional(PROFESSIONAL_ID, { onlyActive: true });
    const all = await designRepository.listElementsByProfessional(PROFESSIONAL_ID);
    expect(activeOnly.find((e) => e.id === created.id)).toBeUndefined();
    expect(all.find((e) => e.id === created.id)).toBeDefined();
  });

  it("rejects updating color_hex to an invalid value on an existing color element", async () => {
    const { useCase } = makeUseCase();
    const created = await useCase.create({
      professionalId: PROFESSIONAL_ID,
      category: "color",
      code: "red",
      label: "Rojo",
      colorHex: "#FF0000",
    });

    await expect(
      useCase.update({ id: created.id, professionalId: PROFESSIONAL_ID, patch: { colorHex: null } }),
    ).rejects.toBeInstanceOf(InvalidColorHexError);
  });

  it("throws when updating an element that does not exist", async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.update({ id: "missing", professionalId: PROFESSIONAL_ID, patch: { active: false } }),
    ).rejects.toBeInstanceOf(DesignElementNotFoundError);
  });
});
