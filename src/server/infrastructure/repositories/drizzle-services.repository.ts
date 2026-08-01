import { and, eq } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { serviceVariants, services } from "@/server/infrastructure/db/schema/services";
import type { Service, ServiceWithVariants } from "@/server/domain/service/service.entity";
import type { ServiceVariant } from "@/server/domain/service/service-variant.entity";
import type {
  NewService,
  NewServiceVariant,
  ServicePatch,
  ServiceVariantPatch,
  ServicesRepository,
} from "@/server/domain/service/services-repository.port";

function serviceToDomain(row: typeof services.$inferSelect): Service {
  return {
    id: row.id,
    professionalId: row.professionalId,
    name: row.name,
    description: row.description,
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
    nailLength: row.nailLength,
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

  async createVariant(variant: NewServiceVariant): Promise<ServiceVariant> {
    const [row] = await db
      .insert(serviceVariants)
      .values({
        serviceId: variant.serviceId,
        nailLength: variant.nailLength,
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
}
