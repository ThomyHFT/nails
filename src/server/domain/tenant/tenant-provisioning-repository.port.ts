import type { InviteCode } from "@/server/domain/tenant/invite-code.entity";
import type { Professional } from "@/server/domain/professional/professional.entity";
import type { Vertical } from "@/server/domain/tenant/vertical";

export interface ProvisionTenantInput {
  /** Usuario dueño del tenant. La contraseña llega ya hasheada. */
  owner: {
    email: string;
    passwordHash: string;
    name: string;
  };
  professional: {
    slug: string;
    businessName: string;
    vertical: Vertical;
    trialEndsAt: Date | null;
  };
  /** Código a marcar como usado en la misma operación. */
  inviteCodeId: string;
}

export interface ProvisionTenantResult {
  userId: string;
  professional: Professional;
}

export interface CreateInviteCodeInput {
  code: string;
  note: string | null;
  expiresAt: Date | null;
}

export interface InviteCodesRepository {
  findByCode(code: string): Promise<InviteCode | null>;
  /** Todos los códigos, para el panel de superadmin. Sin paginación. */
  findAll(): Promise<InviteCode[]>;
  create(input: CreateInviteCodeInput): Promise<InviteCode>;
}

/**
 * Alta completa de un tenant: usuario, professional, catálogo por defecto y el
 * canje del código de invitación.
 *
 * Es un puerto propio y no un método más de `ProfessionalRepository` porque la
 * operación cruza tres agregados y tiene que ser atómica. La implementación
 * usa `db.batch([...])` con uuid generados en la aplicación: `neon-http` no
 * soporta `db.transaction()` (ver CLAUDE.md).
 */
export interface TenantProvisioningRepository {
  provision(input: ProvisionTenantInput): Promise<ProvisionTenantResult>;
}
