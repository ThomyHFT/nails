import { isValidPhone, normalizePhone, UNUSABLE_PASSWORD_HASH } from "@/server/domain/user/client-contact";
import type { PasswordHasher } from "@/server/domain/user/password-hasher.port";
import type { UserRepository } from "@/server/domain/user/user-repository.port";
import type { User } from "@/server/domain/user/user.entity";

export class EmailAlreadyRegisteredError extends Error {
  constructor(email: string) {
    super(`El email ${email} ya está registrado`);
    this.name = "EmailAlreadyRegisteredError";
  }
}

/**
 * El correo ya tiene una cuenta de clienta sin contraseña (creada a mano por
 * la profesional o al entrar con código). Registrarse no la activa: eso le
 * daría la cuenta, con su historial, a quien escriba el correo sin probar que
 * es suyo. Entra con un código por correo y, si quiere, crea su contraseña.
 */
export class AccountWithoutPasswordError extends Error {
  constructor() {
    super("Ya tienes una cuenta con este correo. Entra con un código por correo y, si quieres, crea tu contraseña desde tu perfil.");
    this.name = "AccountWithoutPasswordError";
  }
}

export class InvalidPhoneError extends Error {
  constructor() {
    super("El teléfono no es válido");
    this.name = "InvalidPhoneError";
  }
}

export interface RegisterClientInput {
  email: string;
  password: string;
  name: string;
  /** Obligatorio desde SPEC 18: es como la profesional contacta a su clienta. */
  phone: string;
}

export class RegisterClientUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: RegisterClientInput): Promise<User> {
    const normalizedEmail = input.email.trim().toLowerCase();

    if (!isValidPhone(input.phone)) {
      throw new InvalidPhoneError();
    }
    const phone = normalizePhone(input.phone);

    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing) {
      if (existing.role === "client" && existing.passwordHash === UNUSABLE_PASSWORD_HASH) {
        throw new AccountWithoutPasswordError();
      }
      throw new EmailAlreadyRegisteredError(normalizedEmail);
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    return this.userRepository.create({
      email: normalizedEmail,
      passwordHash,
      name: input.name,
      phone,
      role: "client",
    });
  }
}
