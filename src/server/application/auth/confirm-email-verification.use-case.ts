import type { EmailVerificationTokensRepository } from "@/server/domain/auth/email-verification-tokens-repository.port";
import type { TokenGenerator } from "@/server/domain/auth/token-generator.port";
import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import type { UserRepository } from "@/server/domain/user/user-repository.port";

export class InvalidVerificationTokenError extends Error {
  constructor() {
    super("Este enlace de verificación no es válido o ya venció");
    this.name = "InvalidVerificationTokenError";
  }
}

/**
 * Confirma el correo y, si quien lo verifica es dueña de un tenant, publica su
 * micrositio. Es el único lugar donde `professionals.published_at` se setea:
 * ver SPEC 11 — la verificación bloquea publicar, no entrar al panel.
 */
export class ConfirmEmailVerificationUseCase {
  constructor(
    private readonly emailVerificationTokensRepository: EmailVerificationTokensRepository,
    private readonly userRepository: UserRepository,
    private readonly professionalRepository: ProfessionalRepository,
    private readonly tokenGenerator: TokenGenerator,
  ) {}

  async execute(token: string, now: Date = new Date()): Promise<void> {
    const tokenHash = this.tokenGenerator.hashToken(token);
    const record = await this.emailVerificationTokensRepository.findByTokenHash(tokenHash);

    if (!record || record.usedAt !== null || record.expiresAt <= now) {
      throw new InvalidVerificationTokenError();
    }

    await this.emailVerificationTokensRepository.markUsed(record.id);
    await this.userRepository.markEmailVerified(record.userId);

    const professional = await this.professionalRepository.findByOwnerUserId(record.userId);
    if (professional && professional.publishedAt === null) {
      await this.professionalRepository.markPublished(professional.id);
    }
  }
}
