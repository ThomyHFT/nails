import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";

/** Marca de un tenant que todavía no configuró /admin/marca: la de Minimal Nude. */
export function defaultTenantBranding(professionalId: string): TenantBranding {
  return {
    id: professionalId,
    professionalId,
    archetype: "minimal_nude",
    primaryColorHex: null,
    onPrimaryColorHex: null,
    fontPair: null,
    logoUrl: null,
    coverImageUrl: null,
    heroLayout: "split",
    sectionOrder: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
