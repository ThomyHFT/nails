import type { Service, ServiceWithVariants } from "@/server/domain/service/service.entity";
import type { ServiceVariant } from "@/server/domain/service/service-variant.entity";

export interface NewService {
  professionalId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
}

export interface ServicePatch {
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  active?: boolean;
}

export interface NewServiceVariant {
  serviceId: string;
  label: string;
  priceClp: number;
  durationMinutes: number;
}

export interface ServiceVariantPatch {
  priceClp?: number;
  durationMinutes?: number;
  active?: boolean;
}

export interface ServicesRepository {
  listByProfessional(professionalId: string): Promise<ServiceWithVariants[]>;
  findById(id: string, professionalId: string): Promise<ServiceWithVariants | null>;
  createService(service: NewService): Promise<Service>;
  updateService(id: string, professionalId: string, patch: ServicePatch): Promise<Service>;
  deleteService(id: string, professionalId: string): Promise<void>;
  createVariant(variant: NewServiceVariant): Promise<ServiceVariant>;
  findVariantById(id: string, professionalId: string): Promise<ServiceVariant | null>;
  updateVariant(id: string, professionalId: string, patch: ServiceVariantPatch): Promise<ServiceVariant>;
  deleteVariant(id: string, professionalId: string): Promise<void>;
  hasBookingsForVariant(variantId: string): Promise<boolean>;
}
