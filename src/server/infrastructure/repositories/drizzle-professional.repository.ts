import { eq } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { professionals } from "@/server/infrastructure/db/schema/users";
import type { Professional } from "@/server/domain/professional/professional.entity";
import type { ContactInfoInput, ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";

function toDomain(row: typeof professionals.$inferSelect): Professional {
  return {
    id: row.id,
    slug: row.slug,
    ownerUserId: row.ownerUserId,
    businessName: row.businessName,
    bio: row.bio,
    tagline: row.tagline,
    phone: row.phone,
    phoneVisible: row.phoneVisible,
    address: row.address,
    addressVisible: row.addressVisible,
    instagramHandle: row.instagramHandle,
    timezone: row.timezone,
    active: row.active,
    publishedAt: row.publishedAt,
    trialEndsAt: row.trialEndsAt,
    bufferMinutes: row.bufferMinutes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleProfessionalRepository implements ProfessionalRepository {
  async findById(id: string): Promise<Professional | null> {
    const [row] = await db.select().from(professionals).where(eq(professionals.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async findBySlug(slug: string): Promise<Professional | null> {
    const [row] = await db.select().from(professionals).where(eq(professionals.slug, slug)).limit(1);
    return row ? toDomain(row) : null;
  }

  async findByOwnerUserId(ownerUserId: string): Promise<Professional | null> {
    const [row] = await db
      .select()
      .from(professionals)
      .where(eq(professionals.ownerUserId, ownerUserId))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async updateBufferMinutes(professionalId: string, bufferMinutes: number): Promise<Professional> {
    const [row] = await db
      .update(professionals)
      .set({ bufferMinutes, updatedAt: new Date() })
      .where(eq(professionals.id, professionalId))
      .returning();
    return toDomain(row);
  }

  async updateTagline(professionalId: string, tagline: string | null): Promise<Professional> {
    const [row] = await db
      .update(professionals)
      .set({ tagline, updatedAt: new Date() })
      .where(eq(professionals.id, professionalId))
      .returning();
    return toDomain(row);
  }

  async updateContactInfo(professionalId: string, input: ContactInfoInput): Promise<Professional> {
    const [row] = await db
      .update(professionals)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(professionals.id, professionalId))
      .returning();
    return toDomain(row);
  }

  async markPublished(professionalId: string): Promise<Professional> {
    const [row] = await db
      .update(professionals)
      .set({ publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(professionals.id, professionalId))
      .returning();
    return toDomain(row);
  }
}
