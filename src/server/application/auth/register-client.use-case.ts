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
      // Una clienta que la profesional agendó a mano con su correo (SPEC 18)
      // ya tiene usuario, pero sin contraseña: registrarse la activa, con su
      // historial, en vez de rechazarla por "correo ya registrado".
      if (existing.role === "client" && existing.passwordHash === UNUSABLE_PASSWORD_HASH) {
        const passwordHash = await this.passwordHasher.hash(input.password);
        await this.userRepository.updateProfile(existing.id, { name: input.name, phone, passwordHash });
        return { ...existing, name: input.name, phone, passwordHash };
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
