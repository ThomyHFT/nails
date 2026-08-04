import { eq } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { inviteCodes } from "@/server/infrastructure/db/schema/invites";
import { professionals, users } from "@/server/infrastructure/db/schema/users";
import { serviceVariants, services } from "@/server/infrastructure/db/schema/services";
import { designElements } from "@/server/infrastructure/db/schema/designs";
import { defaultDesignElements, defaultServices } from "@/server/domain/tenant/default-catalog";
import type { Professional } from "@/server/domain/professional/professional.entity";
import type {
  ProvisionTenantInput,
  ProvisionTenantResult,
  TenantProvisioningRepository,
} from "@/server/domain/tenant/tenant-provisioning-repository.port";

function professionalToDomain(row: typeof professionals.$inferSelect): Professional {
  return {
    id: row.id,
    slug: row.slug,
    ownerUserId: row.ownerUserId,
    businessName: row.businessName,
    vertical: row.vertical,
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

/**
 * Alta atómica de un tenant: usuario, professional, catálogo de diseño,
 * servicios con sus variantes, y el canje del código de invitación.
 *
 * `neon-http` no soporta `db.transaction()` (ver CLAUDE.md), así que la
 * atomicidad sale de `db.batch([...])` con los ids generados acá mismo —
 * mismo patrón que `DrizzleBookingRepository.createWithDesign`.
 */
export class DrizzleTenantProvisioningRepository implements TenantProvisioningRepository {
  async provision(input: ProvisionTenantInput): Promise<ProvisionTenantResult> {
    const userId = crypto.randomUUID();
    const professionalId = crypto.randomUUID();

    const catalogElements = defaultDesignElements(input.professional.vertical).map((element) => ({
      id: crypto.randomUUID(),
      professionalId,
      ...element,
    }));

    const catalogServices = defaultServices(input.professional.vertical).map((service) => ({
      id: crypto.randomUUID(),
      professionalId,
      name: service.name,
      sortOrder: service.sortOrder,
      variants: service.variants.map((variant) => ({ id: crypto.randomUUID(), ...variant })),
    }));

    const [, professionalRows] = await db.batch([
      db.insert(users).values({
        id: userId,
        email: input.owner.email,
        passwordHash: input.owner.passwordHash,
        name: input.owner.name,
        role: "professional",
      }),
      db
        .insert(professionals)
        .values({
          id: professionalId,
          slug: input.professional.slug,
          ownerUserId: userId,
          businessName: input.professional.businessName,
          vertical: input.professional.vertical,
          publishedAt: null,
          trialEndsAt: input.professional.trialEndsAt,
        })
        .returning(),
      // Sin diseñador (verticalModules) no hay catálogo que sembrar: se omite
      // la inserción entera en vez de insertar una lista vacía.
      ...(catalogElements.length > 0 ? [db.insert(designElements).values(catalogElements)] : []),
      ...catalogServices.map((service) =>
        db.insert(services).values({
          id: service.id,
          professionalId,
          name: service.name,
          sortOrder: service.sortOrder,
        }),
      ),
      ...catalogServices.flatMap((service) =>
        service.variants.map((variant) =>
          db.insert(serviceVariants).values({
            id: variant.id,
            serviceId: service.id,
            nailLength: variant.nailLength,
            priceClp: variant.priceClp,
            durationMinutes: variant.durationMinutes,
          }),
        ),
      ),
      db
        .update(inviteCodes)
        .set({ usedByProfessionalId: professionalId, usedAt: new Date() })
        .where(eq(inviteCodes.id, input.inviteCodeId)),
    ]);

    return { userId, professional: professionalToDomain(professionalRows[0]) };
  }
}
