import type { InviteCode } from "@/server/domain/tenant/invite-code.entity";
import type { Professional } from "@/server/domain/professional/professional.entity";
import type {
  InviteCodesRepository,
  ProvisionTenantInput,
  ProvisionTenantResult,
  TenantProvisioningRepository,
} from "@/server/domain/tenant/tenant-provisioning-repository.port";

export class InMemoryInviteCodesRepository implements InviteCodesRepository {
  readonly codes: InviteCode[] = [];

  add(overrides: Partial<InviteCode> & { code: string }): InviteCode {
    const created: InviteCode = {
      id: `invite-${this.codes.length + 1}`,
      note: null,
      usedByProfessionalId: null,
      usedAt: null,
      expiresAt: null,
      createdAt: new Date(),
      ...overrides,
    };
    this.codes.push(created);
    return created;
  }

  async findByCode(code: string): Promise<InviteCode | null> {
    return this.codes.find((candidate) => candidate.code === code) ?? null;
  }
}

export class InMemoryTenantProvisioningRepository implements TenantProvisioningRepository {
  readonly provisioned: ProvisionTenantInput[] = [];
  private nextId = 1;

  async provision(input: ProvisionTenantInput): Promise<ProvisionTenantResult> {
    this.provisioned.push(input);
    const id = `professional-${this.nextId++}`;

    const professional: Professional = {
      id,
      slug: input.professional.slug,
      ownerUserId: `user-${id}`,
      businessName: input.professional.businessName,
      bio: null,
      tagline: null,
      phone: null,
      phoneVisible: true,
      address: null,
      addressVisible: true,
      instagramHandle: null,
      timezone: "America/Santiago",
      active: true,
      // Nace despublicado: verificar el correo es lo que lo publica.
      publishedAt: null,
      trialEndsAt: input.professional.trialEndsAt,
      bufferMinutes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { userId: professional.ownerUserId, professional };
  }
}
