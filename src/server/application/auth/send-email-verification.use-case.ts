import { buildEmailVerificationEmail } from "@/server/domain/auth/email-verification-email";
import type { EmailVerificationTokensRepository } from "@/server/domain/auth/email-verification-tokens-repository.port";
import type { TokenGenerator } from "@/server/domain/auth/token-generator.port";
import type { EmailSender } from "@/server/domain/notification/email-sender.port";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 3;

export type SendEmailVerificationResult = "sent" | "rate_limited" | "no_sender";

/**
 * Envía (o reenvía) el correo de verificación. Se llama tanto justo después
 * del registro como desde "reenviar" en el panel — mismo caso de uso, misma
 * regla de rate limit, para que abusar del reenvío no sea gratis.
 */
export class SendEmailVerificationUseCase {
  constructor(
    private readonly emailVerificationTokensRepository: EmailVerificationTokensRepository,
    private readonly tokenGenerator: TokenGenerator,
    private readonly emailSender: EmailSender | null,
  ) {}

  async execute(input: {
    userId: string;
    email: string;
    businessName: string;
    baseUrl: string;
  }): Promise<SendEmailVerificationResult> {
    if (!this.emailSender) {
      return "no_sender";
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.emailVerificationTokensRepository.countRecentByUserId(input.userId, oneHourAgo);
    if (recentCount >= MAX_REQUESTS_PER_HOUR) {
      return "rate_limited";
    }

    const token = this.tokenGenerator.generateToken();
    const tokenHash = this.tokenGenerator.hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await this.emailVerificationTokensRepository.create({ userId: input.userId, tokenHash, expiresAt });

    const verifyUrl = `${input.baseUrl}/verificar/${token}`;
    const template = buildEmailVerificationEmail({ businessName: input.businessName, verifyUrl });

    await this.emailSender.send({ to: input.email, subject: template.subject, html: template.html });

    return "sent";
  }
}
