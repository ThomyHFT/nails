import type { PasswordHasher } from "@/server/domain/user/password-hasher.port";
import type { Professional } from "@/server/domain/professional/professional.entity";
import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import { checkInviteCode } from "@/server/domain/tenant/invite-code.entity";
import type {
  InviteCodesRepository,
  TenantProvisioningRepository,
} from "@/server/domain/tenant/tenant-provisioning-repository.port";
import { validateSlug } from "@/server/domain/tenant/reserved-slugs";
import type { UserRepository } from "@/server/domain/user/user-repository.port";

export const TRIAL_DAYS = 30;
export const MIN_PASSWORD_LENGTH = 8;

export class InviteCodeInvalidError extends Error {
  constructor() {
    // Un solo mensaje para "no existe", "ya usado" y "vencido": distinguirlos
    // le confirmaría a un extraño que el código existía.
    super("El código de invitación no es válido");
    this.name = "InviteCodeInvalidError";
  }
}

export class SlugUnavailableError extends Error {
  constructor() {
    // Mismo mensaje para un slug tomado y uno reservado: la lista de
    // reservados no le sirve a quien se registra.
    super("Esa dirección no está disponible");
    this.name = "SlugUnavailableError";
  }
}

export class InvalidSlugFormatError extends Error {
  constructor() {
    super("La dirección solo puede tener minúsculas, números y guiones");
    this.name = "InvalidSlugFormatError";
  }
}

export class EmailTakenError extends Error {
  constructor() {
    super("Ese correo ya tiene una cuenta");
    this.name = "EmailTakenError";
  }
}

export class WeakPasswordError extends Error {
  constructor() {
    super(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
    this.name = "WeakPasswordError";
  }
}

export class BusinessNameRequiredError extends Error {
  constructor() {
    super("El nombre del negocio es requerido");
    this.name = "BusinessNameRequiredError";
  }
}

export interface RegisterProfessionalInput {
  inviteCode: string;
  slug: string;
  businessName: string;
  name: string;
  email: string;
  password: string;
}

export interface RegisterProfessionalResult {
  userId: string;
  professional: Professional;
}

/**
 * Alta de una manicurista y su tenant.
 *
 * El tenant nace despublicado (`publishedAt: null`) y con la prueba corriendo.
 * Verificar el correo es lo que lo publica — ver SPEC 11: la verificación
 * bloquea publicar, no entrar, así que puede configurar todo su negocio
 * mientras tanto.
 */
export class RegisterProfessionalUseCase {
  constructor(
    private readonly inviteCodesRepository: InviteCodesRepository,
    private readonly userRepository: UserRepository,
    private readonly professionalRepository: ProfessionalRepository,
    private readonly tenantProvisioningRepository: TenantProvisioningRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: RegisterProfessionalInput, now: Date = new Date()): Promise<RegisterProfessionalResult> {
    const slug = input.slug.trim().toLowerCase();
    const email = input.email.trim().toLowerCase();

    // Lo barato y puro primero: no vale la pena consultar la base para un
    // slug que ni siquiera tiene forma válida.
    const slugValidity = validateSlug(slug);
    if (slugValidity === "invalid_format") {
      throw new InvalidSlugFormatError();
    }
    if (slugValidity === "reserved") {
      throw new SlugUnavailableError();
    }

    if (!input.businessName.trim()) {
      throw new BusinessNameRequiredError();
    }
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new WeakPasswordError();
    }

    const inviteCode = await this.inviteCodesRepository.findByCode(input.inviteCode.trim());
    if (checkInviteCode(inviteCode, now) !== "ok" || !inviteCode) {
      throw new InviteCodeInvalidError();
    }

    if (await this.professionalRepository.findBySlug(slug)) {
      throw new SlugUnavailableError();
    }
    if (await this.userRepository.findByEmail(email)) {
      throw new EmailTakenError();
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    return this.tenantProvisioningRepository.provision({
      owner: { email, passwordHash, name: input.name.trim() },
      professional: { slug, businessName: input.businessName.trim(), trialEndsAt },
      inviteCodeId: inviteCode.id,
    });
  }
}
