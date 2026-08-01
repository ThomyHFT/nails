import type { Service } from "@/server/domain/service/service.entity";
import type { NailLength, ServiceVariant } from "@/server/domain/service/service-variant.entity";
import type {
  NewService,
  NewServiceVariant,
  ServicePatch,
  ServiceVariantPatch,
  ServicesRepository,
} from "@/server/domain/service/services-repository.port";

const NAIL_LENGTHS: NailLength[] = ["short", "medium", "long", "single"];

export class InvalidServiceNameError extends Error {
  constructor() {
    super("El nombre del servicio no puede estar vacío");
    this.name = "InvalidServiceNameError";
  }
}

export class InvalidPriceError extends Error {
  constructor() {
    super("price_clp debe ser un entero mayor a cero");
    this.name = "InvalidPriceError";
  }
}

export class InvalidDurationError extends Error {
  constructor() {
    super("duration_minutes debe ser un entero mayor a cero");
    this.name = "InvalidDurationError";
  }
}

export class InvalidNailLengthError extends Error {
  constructor() {
    super("nail_length no existe");
    this.name = "InvalidNailLengthError";
  }
}

export class DuplicateNailLengthError extends Error {
  constructor() {
    super("Ya existe una variante con este largo para este servicio");
    this.name = "DuplicateNailLengthError";
  }
}

export class ServiceNotFoundError extends Error {
  constructor() {
    super("El servicio no existe");
    this.name = "ServiceNotFoundError";
  }
}

export class VariantNotFoundError extends Error {
  constructor() {
    super("La variante no existe");
    this.name = "VariantNotFoundError";
  }
}

function assertPositiveInteger(value: number, ErrorClass: new () => Error): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ErrorClass();
  }
}

export interface CreateVariantInput extends NewServiceVariant {
  professionalId: string;
}

export class ConfigureServicesUseCase {
  constructor(private readonly servicesRepository: ServicesRepository) {}

  async createService(input: NewService): Promise<Service> {
    if (!input.name.trim()) {
      throw new InvalidServiceNameError();
    }
    return this.servicesRepository.createService(input);
  }

  async updateService(id: string, professionalId: string, patch: ServicePatch): Promise<Service> {
    if (patch.name !== undefined && !patch.name.trim()) {
      throw new InvalidServiceNameError();
    }
    const existing = await this.servicesRepository.findById(id, professionalId);
    if (!existing) {
      throw new ServiceNotFoundError();
    }
    return this.servicesRepository.updateService(id, professionalId, patch);
  }

  async createVariant(input: CreateVariantInput): Promise<ServiceVariant> {
    if (!NAIL_LENGTHS.includes(input.nailLength)) {
      throw new InvalidNailLengthError();
    }
    assertPositiveInteger(input.priceClp, InvalidPriceError);
    assertPositiveInteger(input.durationMinutes, InvalidDurationError);

    const service = await this.servicesRepository.findById(input.serviceId, input.professionalId);
    if (!service) {
      throw new ServiceNotFoundError();
    }
    if (service.variants.some((v) => v.nailLength === input.nailLength)) {
      throw new DuplicateNailLengthError();
    }

    return this.servicesRepository.createVariant({
      serviceId: input.serviceId,
      nailLength: input.nailLength,
      priceClp: input.priceClp,
      durationMinutes: input.durationMinutes,
    });
  }

  async updateVariant(id: string, professionalId: string, patch: ServiceVariantPatch): Promise<ServiceVariant> {
    if (patch.priceClp !== undefined) {
      assertPositiveInteger(patch.priceClp, InvalidPriceError);
    }
    if (patch.durationMinutes !== undefined) {
      assertPositiveInteger(patch.durationMinutes, InvalidDurationError);
    }
    const existing = await this.servicesRepository.findVariantById(id, professionalId);
    if (!existing) {
      throw new VariantNotFoundError();
    }
    return this.servicesRepository.updateVariant(id, professionalId, patch);
  }
}
