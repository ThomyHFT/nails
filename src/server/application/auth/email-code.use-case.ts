import {
  buildEmailCodeEmail,
  EMAIL_CODE_MAX_ATTEMPTS,
  EMAIL_CODE_MAX_PER_WINDOW,
  EMAIL_CODE_RATE_WINDOW_MS,
  EMAIL_CODE_TTL_MS,
  emailCodeHashInput,
  normalizeEmail,
  type EmailCodePurpose,
  type EmailCodesRepository,
} from "@/server/domain/auth/email-code";
import type { TokenGenerator } from "@/server/domain/auth/token-generator.port";
import type { BrandingRepository } from "@/server/domain/branding/branding-repository.port";
import { defaultTenantBranding } from "@/server/domain/branding/default-tenant-branding";
import type { EmailSender } from "@/server/domain/notification/email-sender.port";
import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import { isValidPhone, normalizePhone, UNUSABLE_PASSWORD_HASH } from "@/server/domain/user/client-contact";
import type { UserRepository } from "@/server/domain/user/user-repository.port";
import type { User } from "@/server/domain/user/user.entity";

export type IssueEmailCodeResult = "sent" | "rate_limited" | "email_unavailable";

export interface EmailCodeDeps {
  codes: EmailCodesRepository;
  tokens: TokenGenerator;
  professionals: ProfessionalRepository;
  branding: BrandingRepository;
  emailSender: EmailSender | null;
}

/**
 * Genera, guarda (hasheado) y envía un código con la marca del tenant.
 * Compartido entre entrar sin contraseña y cambiar de correo.
 */
export async function issueEmailCode(
  deps: EmailCodeDeps,
  input: { email: string; purpose: EmailCodePurpose; userId: string | null; slug: string; now?: Date },
): Promise<IssueEmailCodeResult> {
  if (!deps.emailSender) return "email_unavailable";
  const now = input.now ?? new Date();
  const email = normalizeEmail(input.email);

  const recent = await deps.codes.countCreatedSince(email, input.purpose, new Date(now.getTime() - EMAIL_CODE_RATE_WINDOW_MS));
  if (recent >= EMAIL_CODE_MAX_PER_WINDOW) return "rate_limited";

  const professional = await deps.professionals.findBySlug(input.slug);
  if (!professional) return "sent";

  const code = deps.tokens.generateCode();
  await deps.codes.create({
    email,
    purpose: input.purpose,
    userId: input.userId,
    codeHash: deps.tokens.hashToken(emailCodeHashInput(email, code)),
    expiresAt: new Date(now.getTime() + EMAIL_CODE_TTL_MS),
  });

  const branding = await deps.branding.findByProfessionalId(professional.id);
  const template = buildEmailCodeEmail({
    code,
    professionalName: professional.businessName,
    branding: branding ?? defaultTenantBranding(professional.id),
    purpose: input.purpose,
  });
  const result = await deps.emailSender.send({ to: email, subject: template.subject, html: template.html });
  return result.ok ? "sent" : "email_unavailable";
}

/**
 * Verifica y consume el último código vigente. Cada fallo suma un intento;
 * al quinto el código queda inútil aunque luego llegue el correcto.
 */
export async function verifyEmailCode(
  codes: EmailCodesRepository,
  tokens: TokenGenerator,
  input: { email: string; purpose: EmailCodePurpose; userId: string | null; code: string; now?: Date },
): Promise<boolean> {
  const now = input.now ?? new Date();
  const email = normalizeEmail(input.email);
  const stored = await codes.findLatestActive(email, input.purpose, input.userId);
  if (!stored) return false;
  if (stored.expiresAt.getTime() <= now.getTime() || stored.attempts >= EMAIL_CODE_MAX_ATTEMPTS) return false;

  if (tokens.hashToken(emailCodeHashInput(email, input.code.trim())) !== stored.codeHash) {
    await codes.incrementAttempts(stored.id);
    return false;
  }
  return codes.consume(stored.id);
}

export interface RequestLoginCodeResult {
  status: IssueEmailCodeResult;
  /** Sin cuenta: el formulario pide nombre y teléfono antes de entrar. */
  isNewClient: boolean;
}

/**
 * Quién entra con código: clientas y, desde el SPEC 22, integrantes de un
 * salón (nacen sin contraseña). Dueñas y superadmin, solo con contraseña.
 */
const CODE_LOGIN_ROLES = new Set(["client", "staff"]);

export class RequestLoginCodeUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly deps: EmailCodeDeps,
  ) {}

  async execute(input: { email: string; slug: string; now?: Date }): Promise<RequestLoginCodeResult> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));
    // Profesionales y superadmin entran solo con contraseña: misma respuesta, sin correo.
    if (user && !CODE_LOGIN_ROLES.has(user.role)) return { status: "sent", isNewClient: false };
    const status = await issueEmailCode(this.deps, { email: input.email, purpose: "login", userId: null, slug: input.slug, now: input.now });
    return { status, isNewClient: !user };
  }
}

export class InvalidEmailCodeError extends Error {
  constructor() {
    super("El código no es válido o ya venció. Pide uno nuevo.");
    this.name = "InvalidEmailCodeError";
  }
}

export class ClientProfileRequiredError extends Error {
  constructor() {
    super("Para crear tu cuenta necesitamos tu nombre y un teléfono válido.");
    this.name = "ClientProfileRequiredError";
  }
}

/**
 * Entrar con código (SPEC 20). Si el correo no tiene cuenta la crea como
 * clienta sin contraseña y con el correo verificado: acaba de probar que lo
 * recibe. El perfil se valida antes de consumir el código, para que un
 * teléfono mal escrito no obligue a pedir otro.
 */
export class SignInWithEmailCodeUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly codes: EmailCodesRepository,
    private readonly tokens: TokenGenerator,
  ) {}

  async execute(input: { email: string; code: string; name?: string; phone?: string; now?: Date }): Promise<User> {
    const email = normalizeEmail(input.email);
    const existing = await this.users.findByEmail(email);
    if (existing && !CODE_LOGIN_ROLES.has(existing.role)) throw new InvalidEmailCodeError();

    const name = input.name?.trim() ?? "";
    if (!existing && (name.length < 2 || !input.phone || !isValidPhone(input.phone))) {
      throw new ClientProfileRequiredError();
    }

    const ok = await verifyEmailCode(this.codes, this.tokens, { email, purpose: "login", userId: null, code: input.code, now: input.now });
    if (!ok) throw new InvalidEmailCodeError();

    if (existing) {
      if (!existing.emailVerifiedAt) await this.users.markEmailVerified(existing.id);
      return existing;
    }
    const created = await this.users.create({
      email,
      passwordHash: UNUSABLE_PASSWORD_HASH,
      name,
      phone: normalizePhone(input.phone as string),
      role: "client",
    });
    await this.users.markEmailVerified(created.id);
    return created;
  }
}
