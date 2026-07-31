import type { PasswordHasher } from "@/server/domain/user/password-hasher.port";
import type { UserRepository } from "@/server/domain/user/user-repository.port";
import type { User } from "@/server/domain/user/user.entity";

export class EmailAlreadyRegisteredError extends Error {
  constructor(email: string) {
    super(`El email ${email} ya está registrado`);
    this.name = "EmailAlreadyRegisteredError";
  }
}

export interface RegisterClientInput {
  email: string;
  password: string;
  name: string;
  phone?: string | null;
}

export class RegisterClientUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: RegisterClientInput): Promise<User> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new EmailAlreadyRegisteredError(normalizedEmail);
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    return this.userRepository.create({
      email: normalizedEmail,
      passwordHash,
      name: input.name,
      phone: input.phone ?? null,
      role: "client",
    });
  }
}
