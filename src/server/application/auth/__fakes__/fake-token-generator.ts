import type { TokenGenerator } from "@/server/domain/auth/token-generator.port";

export class FakeTokenGenerator implements TokenGenerator {
  nextToken = "fake-token";

  generateToken(): string {
    return this.nextToken;
  }

  hashToken(token: string): string {
    return `hashed:${token}`;
  }
}
