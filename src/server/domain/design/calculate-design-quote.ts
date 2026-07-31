import type { DesignElement } from "@/server/domain/design/design-element.entity";
import type { NailDesignPayload } from "@/server/domain/design/nail-design-payload";

export type DesignQuote = { extraPriceClp: number; extraMinutes: number };

export class InvalidDesignElementError extends Error {
  constructor(code: string) {
    super(`El elemento "${code}" no existe en el catálogo o está inactivo`);
    this.name = "InvalidDesignElementError";
  }
}

function resolveActiveElement(code: string, catalog: DesignElement[]): DesignElement {
  const element = catalog.find((candidate) => candidate.code === code);
  if (!element || !element.active) {
    throw new InvalidDesignElementError(code);
  }
  return element;
}

export function calculateDesignQuote(payload: NailDesignPayload, catalog: DesignElement[]): DesignQuote {
  let extraPriceClp = 0;
  let extraMinutes = 0;

  for (const nail of payload.nails) {
    const color = resolveActiveElement(nail.baseColorCode, catalog);
    extraPriceClp += color.priceDeltaClp;
    extraMinutes += color.extraMinutes;

    const finish = resolveActiveElement(nail.finish, catalog);
    extraPriceClp += finish.priceDeltaClp;
    extraMinutes += finish.extraMinutes;

    for (const decorationCode of nail.decorations) {
      const decoration = resolveActiveElement(decorationCode, catalog);
      extraPriceClp += decoration.priceDeltaClp;
      extraMinutes += decoration.extraMinutes;
    }
  }

  if (payload.technique !== null) {
    const technique = resolveActiveElement(payload.technique, catalog);
    extraPriceClp += technique.priceDeltaClp;
    extraMinutes += technique.extraMinutes;
  }

  return { extraPriceClp, extraMinutes };
}
