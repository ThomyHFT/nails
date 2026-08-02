import type { EmailVerificationToken } from "@/server/domain/auth/email-verification-token.entity";

export interface NewEmailVerificationToken {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface EmailVerificationTokensRepository {
  create(token: NewEmailVerificationToken): Promise<EmailVerificationToken>;
  findByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null>;
  markUsed(id: string): Promise<void>;
  countRecentByUserId(userId: string, since: Date): Promise<number>;
}
