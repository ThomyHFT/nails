import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { portfolioItems } from "@/server/infrastructure/db/schema/content";
import type { PortfolioItem } from "@/server/domain/portfolio/portfolio-item.entity";
import type {
  NewPortfolioItem,
  PortfolioItemPatch,
  PortfolioRepository,
} from "@/server/domain/portfolio/portfolio-repository.port";

function toDomain(row: typeof portfolioItems.$inferSelect): PortfolioItem {
  return {
    id: row.id,
    professionalId: row.professionalId,
    imageUrl: row.imageUrl,
    caption: row.caption,
    serviceId: row.serviceId,
    designId: row.designId,
    sortOrder: row.sortOrder,
    published: row.published,
    createdAt: row.createdAt,
  };
}

export class DrizzlePortfolioRepository implements PortfolioRepository {
  async listByProfessional(professionalId: string): Promise<PortfolioItem[]> {
    const rows = await db
      .select()
      .from(portfolioItems)
      .where(eq(portfolioItems.professionalId, professionalId))
      .orderBy(asc(portfolioItems.sortOrder));
    return rows.map(toDomain);
  }

  async listPublished(professionalId: string): Promise<PortfolioItem[]> {
    const rows = await db
      .select()
      .from(portfolioItems)
      .where(and(eq(portfolioItems.professionalId, professionalId), eq(portfolioItems.published, true)))
      .orderBy(asc(portfolioItems.sortOrder));
    return rows.map(toDomain);
  }

  async findById(id: string, professionalId: string): Promise<PortfolioItem | null> {
    const [row] = await db
      .select()
      .from(portfolioItems)
      .where(and(eq(portfolioItems.id, id), eq(portfolioItems.professionalId, professionalId)))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async create(item: NewPortfolioItem): Promise<PortfolioItem> {
    const [row] = await db
      .insert(portfolioItems)
      .values({
        professionalId: item.professionalId,
        imageUrl: item.imageUrl,
        caption: item.caption ?? null,
        serviceId: item.serviceId ?? null,
        sortOrder: item.sortOrder ?? 0,
      })
      .returning();
    return toDomain(row);
  }

  async update(id: string, professionalId: string, patch: PortfolioItemPatch): Promise<PortfolioItem> {
    const [row] = await db
      .update(portfolioItems)
      .set(patch)
      .where(and(eq(portfolioItems.id, id), eq(portfolioItems.professionalId, professionalId)))
      .returning();
    return toDomain(row);
  }

  async delete(id: string, professionalId: string): Promise<void> {
    await db
      .delete(portfolioItems)
      .where(and(eq(portfolioItems.id, id), eq(portfolioItems.professionalId, professionalId)));
  }
}
