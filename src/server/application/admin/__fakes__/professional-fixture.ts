import type { Professional } from "@/server/domain/professional/professional.entity";

export function makeProfessional(overrides: Partial<Professional> = {}): Professional {
  return {
    id: "professional-1",
    slug: "unas-por-karla",
    ownerUserId: "user-1",
    businessName: "Uñas por Karla",
    vertical: "nails",
    bio: null,
    tagline: null,
    phone: null,
    phoneVisible: true,
    address: null,
    addressVisible: true,
    instagramHandle: null,
    timezone: "America/Santiago",
    active: true,
    publishedAt: new Date("2026-01-01T00:00:00Z"),
    trialEndsAt: null,
    bufferMinutes: 0,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}
