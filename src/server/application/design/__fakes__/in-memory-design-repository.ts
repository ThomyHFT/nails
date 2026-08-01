import type { Design } from "@/server/domain/design/design.entity";
import type { DesignElement } from "@/server/domain/design/design-element.entity";
import type {
  DesignElementPatch,
  DesignRepository,
  NewDesign,
  NewDesignElement,
} from "@/server/domain/design/design-repository.port";

export class InMemoryDesignRepository implements DesignRepository {
  readonly elements: DesignElement[] = [];
  readonly designs: Design[] = [];
  private nextId = 1;

  async listElementsByProfessional(
    professionalId: string,
    opts?: { onlyActive?: boolean },
  ): Promise<DesignElement[]> {
    return this.elements.filter(
      (element) =>
        element.professionalId === professionalId && (!opts?.onlyActive || element.active),
    );
  }

  async findElementById(id: string, professionalId: string): Promise<DesignElement | null> {
    return this.elements.find((e) => e.id === id && e.professionalId === professionalId) ?? null;
  }

  async createElement(element: NewDesignElement): Promise<DesignElement> {
    const created: DesignElement = {
      id: String(this.nextId++),
      professionalId: element.professionalId,
      category: element.category,
      code: element.code,
      label: element.label,
      colorHex: element.colorHex ?? null,
      priceDeltaClp: element.priceDeltaClp ?? 0,
      extraMinutes: element.extraMinutes ?? 0,
      sortOrder: element.sortOrder ?? 0,
      active: true,
    };
    this.elements.push(created);
    return created;
  }

  async updateElement(id: string, professionalId: string, patch: DesignElementPatch): Promise<DesignElement> {
    const element = this.elements.find((e) => e.id === id && e.professionalId === professionalId);
    if (!element) throw new Error("Elemento no encontrado");
    Object.assign(element, patch);
    return element;
  }

  async create(design: NewDesign): Promise<Design> {
    const created: Design = {
      id: String(this.nextId++),
      professionalId: design.professionalId,
      clientUserId: design.clientUserId,
      source: "client",
      name: null,
      payload: design.payload,
      extraPriceClp: design.extraPriceClp,
      extraMinutes: design.extraMinutes,
      referenceImageUrl: null,
      createdAt: new Date(),
    };
    this.designs.push(created);
    return created;
  }
}
