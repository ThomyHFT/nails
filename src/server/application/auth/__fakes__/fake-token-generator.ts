import type { TokenGenerator } from "@/server/domain/auth/token-generator.port";

export class FakeTokenGenerator implements TokenGenerator {
  nextToken = "fake-token";
  nextCode = "123456";

  generateCode(): string {
    return this.nextCode;
  }

  generateToken(): string {
    return this.nextToken;
  }

  hashToken(token: string): string {
    return `hashed:${token}`;
  }
}
