import type { PasswordResetToken } from "@/server/domain/auth/password-reset-token.entity";

export interface NewPasswordResetToken {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface PasswordResetTokensRepository {
  create(token: NewPasswordResetToken): Promise<PasswordResetToken>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;
  markUsed(id: string): Promise<void>;
  countRecentByUserId(userId: string, since: Date): Promise<number>;
}
