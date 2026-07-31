import type { DesignElement } from "@/server/domain/design/design-element.entity";
import type {
  DesignElementPatch,
  DesignRepository,
  NewDesignElement,
} from "@/server/domain/design/design-repository.port";

const COLOR_HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export class InvalidColorHexError extends Error {
  constructor() {
    super("color_hex es obligatorio y debe tener formato #RRGGBB para la categoría 'color'");
    this.name = "InvalidColorHexError";
  }
}

export class DesignElementNotFoundError extends Error {
  constructor() {
    super("El elemento no existe");
    this.name = "DesignElementNotFoundError";
  }
}

export type CreateDesignElementInput = NewDesignElement;

export interface UpdateDesignElementInput {
  id: string;
  professionalId: string;
  patch: DesignElementPatch;
}

function assertColorHex(category: NewDesignElement["category"], colorHex: string | null | undefined): void {
  if (category === "color") {
    if (!colorHex || !COLOR_HEX_PATTERN.test(colorHex)) {
      throw new InvalidColorHexError();
    }
    return;
  }
  if (colorHex) {
    throw new InvalidColorHexError();
  }
}

export class ConfigureDesignElementsUseCase {
  constructor(private readonly designRepository: DesignRepository) {}

  async create(input: CreateDesignElementInput): Promise<DesignElement> {
    assertColorHex(input.category, input.colorHex);
    return this.designRepository.createElement({
      ...input,
      colorHex: input.category === "color" ? input.colorHex : null,
    });
  }

  async update(input: UpdateDesignElementInput): Promise<DesignElement> {
    const existing = await this.designRepository.findElementById(input.id, input.professionalId);
    if (!existing) {
      throw new DesignElementNotFoundError();
    }

    if ("colorHex" in input.patch) {
      assertColorHex(existing.category, input.patch.colorHex);
    }

    return this.designRepository.updateElement(input.id, input.professionalId, input.patch);
  }
}
