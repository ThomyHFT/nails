import type { Design } from "@/server/domain/design/design.entity";
import type { DesignElement, ElementCategory } from "@/server/domain/design/design-element.entity";
import type { NailDesignPayload } from "@/server/domain/design/nail-design-payload";

export interface NewDesignElement {
  professionalId: string;
  category: ElementCategory;
  code: string;
  label: string;
  colorHex?: string | null;
  priceDeltaClp?: number;
  extraMinutes?: number;
  sortOrder?: number;
}

export interface DesignElementPatch {
  label?: string;
  colorHex?: string | null;
  priceDeltaClp?: number;
  extraMinutes?: number;
  sortOrder?: number;
  active?: boolean;
}

export interface NewDesign {
  professionalId: string;
  clientUserId: string;
  payload: NailDesignPayload;
  extraPriceClp: number;
  extraMinutes: number;
}

export interface DesignRepository {
  listElementsByProfessional(professionalId: string, opts?: { onlyActive?: boolean }): Promise<DesignElement[]>;
  findElementById(id: string, professionalId: string): Promise<DesignElement | null>;
  createElement(element: NewDesignElement): Promise<DesignElement>;
  updateElement(id: string, professionalId: string, patch: DesignElementPatch): Promise<DesignElement>;
  create(design: NewDesign): Promise<Design>;
}
