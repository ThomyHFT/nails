import { issueEmailCode, verifyEmailCode, type EmailCodeDeps, type IssueEmailCodeResult } from "@/server/application/auth/email-code.use-case";
import { normalizeEmail } from "@/server/domain/auth/email-code";
import { isValidPhone, normalizePhone, UNUSABLE_PASSWORD_HASH } from "@/server/domain/user/client-contact";
import type { PasswordHasher } from "@/server/domain/user/password-hasher.port";
import type { UserRepository } from "@/server/domain/user/user-repository.port";

export const MIN_PASSWORD_LENGTH = 8;

export class AccountNotFoundError extends Error {
  constructor() {
    super("Cuenta no encontrada");
    this.name = "AccountNotFoundError";
  }
}

export class AccountValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountValidationError";
  }
}

export class WrongCurrentPasswordError extends Error {
  constructor() {
    super("La contraseña actual no es correcta.");
    this.name = "WrongCurrentPasswordError";
  }
}

export class EmailTakenError extends Error {
  constructor() {
    super("Ese correo ya lo usa otra cuenta.");
    this.name = "EmailTakenError";
  }
}

/** Nombre y teléfono desde la página de cuenta (SPEC 20). */
export class UpdateContactUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string, input: { name: string; phone: string }): Promise<void> {
    const name = input.name.trim();
    if (name.length < 2) throw new AccountValidationError("Escribe tu nombre.");
    if (!isValidPhone(input.phone)) throw new AccountValidationError("El teléfono no es válido.");
    if (!(await this.users.findById(userId))) throw new AccountNotFoundError();
    await this.users.updateContact(userId, { name, phone: normalizePhone(input.phone) });
  }
}

/**
 * Cambiar o crear la contraseña. Una cuenta sin contraseña (entró con
 * código o la creó la profesional) la crea sin pedir la actual: ya probó
 * que es dueña del correo al entrar.
 */
export class ChangePasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(userId: string, input: { currentPassword?: string; newPassword: string }): Promise<void> {
    if (input.newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new AccountValidationError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    }
    const user = await this.users.findById(userId);
    if (!user) throw new AccountNotFoundError();
    if (user.passwordHash !== UNUSABLE_PASSWORD_HASH) {
      if (!input.currentPassword || !(await this.hasher.compare(input.currentPassword, user.passwordHash))) {
        throw new WrongCurrentPasswordError();
      }
    }
    await this.users.updatePasswordHash(userId, await this.hasher.hash(input.newPassword));
  }
}

/** Paso 1 del cambio de correo: código al correo nuevo. */
export class RequestEmailChangeUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly deps: EmailCodeDeps,
  ) {}

  async execute(userId: string, input: { newEmail: string; slug: string }): Promise<IssueEmailCodeResult> {
    const email = normalizeEmail(input.newEmail);
    const user = await this.users.findById(userId);
    if (!user) throw new AccountNotFoundError();
    if (user.email === email) throw new AccountValidationError("Ese ya es tu correo.");
    if (await this.users.findByEmail(email)) throw new EmailTakenError();
    return issueEmailCode(this.deps, { email, purpose: "change_email", userId, slug: input.slug });
  }
}

/** Paso 2: con el código correcto, el correo cambia y queda verificado. */
export class ConfirmEmailChangeUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly codes: EmailCodeDeps["codes"],
    private readonly tokens: EmailCodeDeps["tokens"],
  ) {}

  async execute(userId: string, input: { newEmail: string; code: string }): Promise<void> {
    const email = normalizeEmail(input.newEmail);
    const ok = await verifyEmailCode(this.codes, this.tokens, { email, purpose: "change_email", userId, code: input.code });
    if (!ok) throw new AccountValidationError("El código no es válido o ya venció. Pide uno nuevo.");
    // Pudo registrarse alguien con ese correo mientras tanto.
    if (await this.users.findByEmail(email)) throw new EmailTakenError();
    await this.users.updateEmail(userId, email);
  }
}
