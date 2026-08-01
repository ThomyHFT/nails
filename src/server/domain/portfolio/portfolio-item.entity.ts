export interface PortfolioItem {
  id: string;
  professionalId: string;
  imageUrl: string;
  caption: string | null;
  serviceId: string | null;
  designId: string | null;
  sortOrder: number;
  published: boolean;
  createdAt: Date;
}
