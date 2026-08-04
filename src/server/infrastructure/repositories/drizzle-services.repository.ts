import { and, eq } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { bookings } from "@/server/infrastructure/db/schema/bookings";
import { serviceVariants, services } from "@/server/infrastructure/db/schema/services";
import type { Service, ServiceWithVariants } from "@/server/domain/service/service.entity";
import type { ServiceVariant } from "@/server/domain/service/service-variant.entity";
import { VariantLimitDuringMigrationError } from "@/server/domain/service/service-errors";
import type {
  NewService,
  NewServiceVariant,
  ServicePatch,
  ServiceVariantPatch,
  ServicesRepository,
} from "@/server/domain/service/services-repository.port";

// SPEC 13 fase 2, paso 3: `nail_length` sigue NOT NULL + único por
// `service_id` hasta el paso 4. Cada variante nueva ocupa el primer valor
// libre del enum legado, invisible para quien la crea.
const LEGACY_NAIL_LENGTHS = ["short", "medium", "long", "single"] as const;

// Filas escritas antes del backfill (no debería haber ninguna en producción
// una vez aplicada la migración 0018) caen acá en vez de mostrar `null`.
const LEGACY_LABEL_FALLBACK: Record<(typeof LEGACY_NAIL_LENGTHS)[number], string> = {
  short: "Corta",
  medium: "Media",
  long: "Larga",
  single: "Única",
};

function serviceToDomain(row: typeof services.$inferSelect): Service {
  return {
    id: row.id,
    professionalId: row.professionalId,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    sortOrder: row.sortOrder,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function variantToDomain(row: typeof serviceVariants.$inferSelect): ServiceVariant {
  return {
    id: row.id,
    serviceId: row.serviceId,
    label: row.label ?? LEGACY_LABEL_FALLBACK[row.nailLength],
    priceClp: row.priceClp,
    durationMinutes: row.durationMinutes,
    active: row.active,
  };
}

export class DrizzleServicesRepository implements ServicesRepository {
  async listByProfessional(professionalId: string): Promise<ServiceWithVariants[]> {
    const serviceRows = await db.select().from(services).where(eq(services.professionalId, professionalId));
    if (serviceRows.length === 0) return [];

    const variantRows = await db
      .select({ variant: serviceVariants })
      .from(serviceVariants)
      .innerJoin(services, eq(serviceVariants.serviceId, services.id))
      .where(eq(services.professionalId, professionalId));

    const variantsByService = new Map<string, ServiceVariant[]>();
    for (const { variant } of variantRows) {
      const list = variantsByService.get(variant.serviceId) ?? [];
      list.push(variantToDomain(variant));
      variantsByService.set(variant.serviceId, list);
    }

    return serviceRows
      .map((row) => ({ ...serviceToDomain(row), variants: variantsByService.get(row.id) ?? [] }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async findById(id: string, professionalId: string): Promise<ServiceWithVariants | null> {
    const [row] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, id), eq(services.professionalId, professionalId)))
      .limit(1);
    if (!row) return null;

    const variantRows = await db.select().from(serviceVariants).where(eq(serviceVariants.serviceId, id));
    return { ...serviceToDomain(row), variants: variantRows.map(variantToDomain) };
  }

  async createService(service: NewService): Promise<Service> {
    const [row] = await db
      .insert(services)
      .values({
        professionalId: service.professionalId,
        name: service.name,
        description: service.description ?? null,
        imageUrl: service.imageUrl ?? null,
        sortOrder: service.sortOrder ?? 0,
      })
      .returning();
    return serviceToDomain(row);
  }

  async updateService(id: string, professionalId: string, patch: ServicePatch): Promise<Service> {
    const [row] = await db
      .update(services)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(services.id, id), eq(services.professionalId, professionalId)))
      .returning();
    return serviceToDomain(row);
  }

  async deleteService(id: string, professionalId: string): Promise<void> {
    await db.delete(services).where(and(eq(services.id, id), eq(services.professionalId, professionalId)));
  }

  async createVariant(variant: NewServiceVariant): Promise<ServiceVariant> {
    const existing = await db
      .select({ nailLength: serviceVariants.nailLength })
      .from(serviceVariants)
      .where(eq(serviceVariants.serviceId, variant.serviceId));
    const used = new Set(existing.map((row) => row.nailLength));
    const legacyValue = LEGACY_NAIL_LENGTHS.find((value) => !used.has(value));
    if (!legacyValue) {
      throw new VariantLimitDuringMigrationError();
    }

    const [row] = await db
      .insert(serviceVariants)
      .values({
        serviceId: variant.serviceId,
        nailLength: legacyValue,
        label: variant.label,
        priceClp: variant.priceClp,
        durationMinutes: variant.durationMinutes,
      })
      .returning();
    return variantToDomain(row);
  }

  async findVariantById(id: string, professionalId: string): Promise<ServiceVariant | null> {
    const [row] = await db
      .select({ variant: serviceVariants })
      .from(serviceVariants)
      .innerJoin(services, eq(serviceVariants.serviceId, services.id))
      .where(and(eq(serviceVariants.id, id), eq(services.professionalId, professionalId)))
      .limit(1);
    return row ? variantToDomain(row.variant) : null;
  }

  async updateVariant(id: string, professionalId: string, patch: ServiceVariantPatch): Promise<ServiceVariant> {
    const existing = await this.findVariantById(id, professionalId);
    if (!existing) {
      throw new Error("Variante no encontrada");
    }
    const [row] = await db.update(serviceVariants).set(patch).where(eq(serviceVariants.id, id)).returning();
    return variantToDomain(row);
  }

  async deleteVariant(id: string, professionalId: string): Promise<void> {
    const rows = await db
      .select({ id: serviceVariants.id })
      .from(serviceVariants)
      .innerJoin(services, eq(serviceVariants.serviceId, services.id))
      .where(and(eq(serviceVariants.id, id), eq(services.professionalId, professionalId)))
      .limit(1);
    if (rows.length === 0) return;

    await db.delete(serviceVariants).where(eq(serviceVariants.id, id));
  }

  async hasBookingsForVariant(variantId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.serviceVariantId, variantId))
      .limit(1);
    return Boolean(row);
  }
}
