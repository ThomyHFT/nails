import type { PortfolioItem } from "@/server/domain/portfolio/portfolio-item.entity";

export interface NewPortfolioItem {
  professionalId: string;
  imageUrl: string;
  caption?: string | null;
  serviceId?: string | null;
  sortOrder?: number;
}

export interface PortfolioItemPatch {
  caption?: string | null;
  serviceId?: string | null;
  sortOrder?: number;
  published?: boolean;
}

export interface PortfolioRepository {
  listByProfessional(professionalId: string): Promise<PortfolioItem[]>;
  listPublished(professionalId: string): Promise<PortfolioItem[]>;
  findById(id: string, professionalId: string): Promise<PortfolioItem | null>;
  create(item: NewPortfolioItem): Promise<PortfolioItem>;
  update(id: string, professionalId: string, patch: PortfolioItemPatch): Promise<PortfolioItem>;
  delete(id: string, professionalId: string): Promise<void>;
}
