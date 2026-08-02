import type { PasswordResetTokensRepository } from "@/server/domain/auth/password-reset-tokens-repository.port";
import type { TokenGenerator } from "@/server/domain/auth/token-generator.port";
import type { PasswordHasher } from "@/server/domain/user/password-hasher.port";
import type { UserRepository } from "@/server/domain/user/user-repository.port";

export type ResetPasswordResult = "ok" | "invalid" | "expired" | "used";

export class ResetPasswordUseCase {
  constructor(
    private readonly passwordResetTokensRepository: PasswordResetTokensRepository,
    private readonly userRepository: UserRepository,
    private readonly tokenGenerator: TokenGenerator,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: { token: string; newPassword: string }): Promise<ResetPasswordResult> {
    const tokenHash = this.tokenGenerator.hashToken(input.token);
    const record = await this.passwordResetTokensRepository.findByTokenHash(tokenHash);

    if (!record) {
      return "invalid";
    }
    if (record.usedAt) {
      return "used";
    }
    if (record.expiresAt.getTime() < Date.now()) {
      return "expired";
    }

    const passwordHash = await this.passwordHasher.hash(input.newPassword);
    await this.userRepository.updatePasswordHash(record.userId, passwordHash);
    await this.passwordResetTokensRepository.markUsed(record.id);

    return "ok";
  }
}
