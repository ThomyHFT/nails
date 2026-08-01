import type { Service, ServiceWithVariants } from "@/server/domain/service/service.entity";
import type { ServiceVariant } from "@/server/domain/service/service-variant.entity";
import type {
  NewService,
  NewServiceVariant,
  ServicePatch,
  ServiceVariantPatch,
  ServicesRepository,
} from "@/server/domain/service/services-repository.port";

export class InMemoryServicesRepository implements ServicesRepository {
  readonly services: Service[] = [];
  readonly variants: ServiceVariant[] = [];
  private nextId = 1;

  async listByProfessional(professionalId: string): Promise<ServiceWithVariants[]> {
    return this.services
      .filter((s) => s.professionalId === professionalId)
      .map((s) => ({ ...s, variants: this.variants.filter((v) => v.serviceId === s.id) }));
  }

  async findById(id: string, professionalId: string): Promise<ServiceWithVariants | null> {
    const service = this.services.find((s) => s.id === id && s.professionalId === professionalId);
    if (!service) return null;
    return { ...service, variants: this.variants.filter((v) => v.serviceId === id) };
  }

  async createService(service: NewService): Promise<Service> {
    const created: Service = {
      id: `service-${this.nextId++}`,
      professionalId: service.professionalId,
      name: service.name,
      description: service.description ?? null,
      sortOrder: service.sortOrder ?? 0,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.services.push(created);
    return created;
  }

  async updateService(id: string, professionalId: string, patch: ServicePatch): Promise<Service> {
    const service = this.services.find((s) => s.id === id && s.professionalId === professionalId);
    if (!service) throw new Error("Servicio no encontrado");
    Object.assign(service, patch, { updatedAt: new Date() });
    return service;
  }

  async createVariant(variant: NewServiceVariant): Promise<ServiceVariant> {
    const created: ServiceVariant = {
      id: `variant-${this.nextId++}`,
      serviceId: variant.serviceId,
      nailLength: variant.nailLength,
      priceClp: variant.priceClp,
      durationMinutes: variant.durationMinutes,
      active: true,
    };
    this.variants.push(created);
    return created;
  }

  async findVariantById(id: string, professionalId: string): Promise<ServiceVariant | null> {
    const variant = this.variants.find((v) => v.id === id);
    if (!variant) return null;
    const service = this.services.find((s) => s.id === variant.serviceId && s.professionalId === professionalId);
    return service ? variant : null;
  }

  async updateVariant(id: string, professionalId: string, patch: ServiceVariantPatch): Promise<ServiceVariant> {
    const variant = await this.findVariantById(id, professionalId);
    if (!variant) throw new Error("Variante no encontrada");
    Object.assign(variant, patch);
    return variant;
  }
}
