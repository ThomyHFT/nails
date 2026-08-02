import type { PasswordResetTokensRepository } from "@/server/domain/auth/password-reset-tokens-repository.port";
import { buildPasswordResetEmail } from "@/server/domain/auth/password-reset-email";
import type { TokenGenerator } from "@/server/domain/auth/token-generator.port";
import type { BrandingRepository } from "@/server/domain/branding/branding-repository.port";
import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";
import type { EmailSender } from "@/server/domain/notification/email-sender.port";
import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";
import type { UserRepository } from "@/server/domain/user/user-repository.port";

const TOKEN_TTL_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 3;

export type RequestPasswordResetResult = "ok" | "rate_limited";

function defaultBranding(professionalId: string): TenantBranding {
  return {
    id: professionalId,
    professionalId,
    archetype: "minimal_nude",
    primaryColorHex: null,
    onPrimaryColorHex: null,
    fontPair: null,
    logoUrl: null,
    coverImageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly professionalRepository: ProfessionalRepository,
    private readonly brandingRepository: BrandingRepository,
    private readonly passwordResetTokensRepository: PasswordResetTokensRepository,
    private readonly tokenGenerator: TokenGenerator,
    private readonly emailSender: EmailSender | null,
  ) {}

  async execute(input: { email: string; slug: string; baseUrl: string }): Promise<RequestPasswordResetResult> {
    const [user, professional] = await Promise.all([
      this.userRepository.findByEmail(input.email),
      this.professionalRepository.findBySlug(input.slug),
    ]);

    if (!user || !professional || !this.emailSender) {
      return "ok";
    }

    const oneHourAgo = new Date(Date.now() - TOKEN_TTL_MS);
    const recentCount = await this.passwordResetTokensRepository.countRecentByUserId(user.id, oneHourAgo);
    if (recentCount >= MAX_REQUESTS_PER_HOUR) {
      return "rate_limited";
    }

    const token = this.tokenGenerator.generateToken();
    const tokenHash = this.tokenGenerator.hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await this.passwordResetTokensRepository.create({ userId: user.id, tokenHash, expiresAt });

    const branding = await this.brandingRepository.findByProfessionalId(professional.id);
    const resetUrl = `${input.baseUrl}/${input.slug}/recuperar/${token}`;

    const template = buildPasswordResetEmail({
      professionalName: professional.businessName,
      branding: branding ?? defaultBranding(professional.id),
      resetUrl,
    });

    await this.emailSender.send({ to: user.email, subject: template.subject, html: template.html });

    return "ok";
  }
}
