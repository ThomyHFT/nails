import { randomBytes } from "crypto";
import { describe, expect, it } from "vitest";
import { AesTokenCipher } from "@/server/infrastructure/security/aes-token-cipher";

describe("AesTokenCipher", () => {
  const key = randomBytes(32);
  const cipher = new AesTokenCipher(key);

  it("descifra lo que cifró", () => {
    const encrypted = cipher.encrypt("un-refresh-token-de-google");
    expect(cipher.decrypt(encrypted)).toBe("un-refresh-token-de-google");
  });

  it("nunca guarda el texto plano en el valor cifrado", () => {
    const encrypted = cipher.encrypt("un-refresh-token-de-google");
    expect(encrypted).not.toContain("un-refresh-token-de-google");
  });

  it("falla al descifrar un valor manipulado", () => {
    const encrypted = cipher.encrypt("un-refresh-token-de-google");
    const [iv, authTag, ciphertext] = encrypted.split(".");
    const tampered = [iv, authTag, `${ciphertext.slice(0, -2)}zz`].join(".");

    expect(() => cipher.decrypt(tampered)).toThrow();
  });
});
