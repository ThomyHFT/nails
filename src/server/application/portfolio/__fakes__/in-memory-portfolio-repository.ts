import type { PortfolioItem } from "@/server/domain/portfolio/portfolio-item.entity";
import type {
  NewPortfolioItem,
  PortfolioItemPatch,
  PortfolioRepository,
} from "@/server/domain/portfolio/portfolio-repository.port";

export class InMemoryPortfolioRepository implements PortfolioRepository {
  readonly items: PortfolioItem[] = [];
  private nextId = 1;

  async listByProfessional(professionalId: string): Promise<PortfolioItem[]> {
    return this.items
      .filter((i) => i.professionalId === professionalId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async listPublished(professionalId: string): Promise<PortfolioItem[]> {
    return this.items
      .filter((i) => i.professionalId === professionalId && i.published)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async findById(id: string, professionalId: string): Promise<PortfolioItem | null> {
    return this.items.find((i) => i.id === id && i.professionalId === professionalId) ?? null;
  }

  async create(item: NewPortfolioItem): Promise<PortfolioItem> {
    const created: PortfolioItem = {
      id: `item-${this.nextId++}`,
      professionalId: item.professionalId,
      imageUrl: item.imageUrl,
      caption: item.caption ?? null,
      serviceId: item.serviceId ?? null,
      designId: null,
      sortOrder: item.sortOrder ?? 0,
      published: false,
      createdAt: new Date(),
    };
    this.items.push(created);
    return created;
  }

  async update(id: string, professionalId: string, patch: PortfolioItemPatch): Promise<PortfolioItem> {
    const item = this.items.find((i) => i.id === id && i.professionalId === professionalId);
    if (!item) throw new Error("Ítem no encontrado");
    Object.assign(item, patch);
    return item;
  }

  async delete(id: string, professionalId: string): Promise<void> {
    const index = this.items.findIndex((i) => i.id === id && i.professionalId === professionalId);
    if (index !== -1) this.items.splice(index, 1);
  }
}
