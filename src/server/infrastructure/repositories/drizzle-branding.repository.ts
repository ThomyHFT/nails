import { eq } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { tenantBranding } from "@/server/infrastructure/db/schema/branding";
import type {
  BrandingRepository,
  BrandingUpsert,
} from "@/server/domain/branding/branding-repository.port";
import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";

function toDomain(row: typeof tenantBranding.$inferSelect): TenantBranding {
  return {
    id: row.id,
    professionalId: row.professionalId,
    archetype: row.archetype,
    primaryColorHex: row.primaryColorHex,
    onPrimaryColorHex: row.onPrimaryColorHex,
    fontPair: row.fontPair,
    logoUrl: row.logoUrl,
    coverImageUrl: row.coverImageUrl,
    heroLayout: row.heroLayout,
    sectionOrder: row.sectionOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleBrandingRepository implements BrandingRepository {
  async findByProfessionalId(professionalId: string): Promise<TenantBranding | null> {
    const [row] = await db
      .select()
      .from(tenantBranding)
      .where(eq(tenantBranding.professionalId, professionalId))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async upsert(branding: BrandingUpsert): Promise<TenantBranding> {
    const [row] = await db
      .insert(tenantBranding)
      .values({
        professionalId: branding.professionalId,
        archetype: branding.archetype,
        primaryColorHex: branding.primaryColorHex,
        onPrimaryColorHex: branding.onPrimaryColorHex,
        fontPair: branding.fontPair,
        logoUrl: branding.logoUrl,
        coverImageUrl: branding.coverImageUrl,
        heroLayout: branding.heroLayout,
        sectionOrder: branding.sectionOrder,
      })
      .onConflictDoUpdate({
        target: tenantBranding.professionalId,
        set: {
          archetype: branding.archetype,
          primaryColorHex: branding.primaryColorHex,
          onPrimaryColorHex: branding.onPrimaryColorHex,
          fontPair: branding.fontPair,
          logoUrl: branding.logoUrl,
          coverImageUrl: branding.coverImageUrl,
          heroLayout: branding.heroLayout,
          sectionOrder: branding.sectionOrder,
          updatedAt: new Date(),
        },
      })
      .returning();
    return toDomain(row);
  }
}
