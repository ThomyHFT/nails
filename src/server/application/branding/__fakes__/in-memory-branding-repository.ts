import type {
  BrandingRepository,
  BrandingUpsert,
} from "@/server/domain/branding/branding-repository.port";
import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";

export class InMemoryBrandingRepository implements BrandingRepository {
  readonly rows: TenantBranding[] = [];
  private nextId = 1;

  async findByProfessionalId(professionalId: string): Promise<TenantBranding | null> {
    return this.rows.find((row) => row.professionalId === professionalId) ?? null;
  }

  async upsert(branding: BrandingUpsert): Promise<TenantBranding> {
    const existing = this.rows.find((row) => row.professionalId === branding.professionalId);
    if (existing) {
      Object.assign(existing, branding, { updatedAt: new Date() });
      return existing;
    }
    const created: TenantBranding = {
      id: String(this.nextId++),
      ...branding,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rows.push(created);
    return created;
  }
}
