import { and, eq } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { designElements, designs } from "@/server/infrastructure/db/schema/designs";
import type { Design } from "@/server/domain/design/design.entity";
import type { DesignElement } from "@/server/domain/design/design-element.entity";
import type {
  DesignElementPatch,
  DesignRepository,
  NewDesign,
  NewDesignElement,
} from "@/server/domain/design/design-repository.port";

function elementToDomain(row: typeof designElements.$inferSelect): DesignElement {
  return {
    id: row.id,
    professionalId: row.professionalId,
    category: row.category,
    code: row.code,
    label: row.label,
    colorHex: row.colorHex,
    priceDeltaClp: row.priceDeltaClp,
    extraMinutes: row.extraMinutes,
    sortOrder: row.sortOrder,
    active: row.active,
  };
}

function designToDomain(row: typeof designs.$inferSelect): Design {
  return {
    id: row.id,
    professionalId: row.professionalId,
    clientUserId: row.clientUserId,
    source: row.source,
    name: row.name,
    payload: row.payload,
    extraPriceClp: row.extraPriceClp,
    extraMinutes: row.extraMinutes,
    referenceImageUrl: row.referenceImageUrl,
    createdAt: row.createdAt,
  };
}

export class DrizzleDesignRepository implements DesignRepository {
  async listElementsByProfessional(
    professionalId: string,
    opts?: { onlyActive?: boolean },
  ): Promise<DesignElement[]> {
    const rows = await db
      .select()
      .from(designElements)
      .where(
        opts?.onlyActive
          ? and(eq(designElements.professionalId, professionalId), eq(designElements.active, true))
          : eq(designElements.professionalId, professionalId),
      );
    return rows.map(elementToDomain);
  }

  async findElementById(id: string, professionalId: string): Promise<DesignElement | null> {
    const [row] = await db
      .select()
      .from(designElements)
      .where(and(eq(designElements.id, id), eq(designElements.professionalId, professionalId)))
      .limit(1);
    return row ? elementToDomain(row) : null;
  }

  async createElement(element: NewDesignElement): Promise<DesignElement> {
    const [row] = await db
      .insert(designElements)
      .values({
        professionalId: element.professionalId,
        category: element.category,
        code: element.code,
        label: element.label,
        colorHex: element.colorHex ?? null,
        priceDeltaClp: element.priceDeltaClp ?? 0,
        extraMinutes: element.extraMinutes ?? 0,
        sortOrder: element.sortOrder ?? 0,
      })
      .returning();
    return elementToDomain(row);
  }

  async updateElement(id: string, professionalId: string, patch: DesignElementPatch): Promise<DesignElement> {
    const [row] = await db
      .update(designElements)
      .set(patch)
      .where(and(eq(designElements.id, id), eq(designElements.professionalId, professionalId)))
      .returning();
    return elementToDomain(row);
  }

  async create(design: NewDesign): Promise<Design> {
    const [row] = await db
      .insert(designs)
      .values({
        professionalId: design.professionalId,
        clientUserId: design.clientUserId,
        source: "client",
        name: null,
        payload: design.payload,
        extraPriceClp: design.extraPriceClp,
        extraMinutes: design.extraMinutes,
        referenceImageUrl: null,
      })
      .returning();
    return designToDomain(row);
  }
}
