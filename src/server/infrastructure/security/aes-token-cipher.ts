import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export class AesTokenCipher {
  constructor(private readonly key: Buffer) {}

  encrypt(plain: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
  }

  decrypt(stored: string): string {
    const [ivB64, authTagB64, ciphertextB64] = stored.split(".");
    if (!ivB64 || !authTagB64 || !ciphertextB64) {
      throw new Error("Formato de token cifrado inválido");
    }

    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(authTagB64, "base64"));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, "base64")),
      decipher.final(),
    ]);

    return plaintext.toString("utf8");
  }
}
