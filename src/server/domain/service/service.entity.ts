import type { ServiceVariant } from "@/server/domain/service/service-variant.entity";

export interface Service {
  id: string;
  professionalId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceWithVariants extends Service {
  variants: ServiceVariant[];
}
