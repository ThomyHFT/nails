import type { PasswordHasher } from "@/server/domain/user/password-hasher.port";

const PREFIX = "hashed:";

export class FakePasswordHasher implements PasswordHasher {
  async hash(plainText: string): Promise<string> {
    return `${PREFIX}${plainText}`;
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    return hash === `${PREFIX}${plainText}`;
  }
}
