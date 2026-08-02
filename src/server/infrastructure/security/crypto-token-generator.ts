import { createHash, randomBytes } from "crypto";
import type { TokenGenerator } from "@/server/domain/auth/token-generator.port";

export class CryptoTokenGenerator implements TokenGenerator {
  generateToken(): string {
    return randomBytes(32).toString("hex");
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
