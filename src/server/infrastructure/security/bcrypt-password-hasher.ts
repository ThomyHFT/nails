import bcrypt from "bcrypt";
import type { PasswordHasher } from "@/server/domain/user/password-hasher.port";

const BCRYPT_COST = 12;

export class BcryptPasswordHasher implements PasswordHasher {
  hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, BCRYPT_COST);
  }

  compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
