import { describe, expect, it } from "vitest";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import { FakeTokenGenerator } from "@/server/application/auth/__fakes__/fake-token-generator";
import { FakePasswordHasher } from "@/server/application/auth/__fakes__/fake-password-hasher";
import { InMemoryPasswordResetTokensRepository } from "@/server/application/auth/__fakes__/in-memory-password-reset-tokens-repository";
import { ResetPasswordUseCase } from "@/server/application/auth/reset-password.use-case";

async function setup() {
  const userRepository = new InMemoryUserRepository();
  const passwordResetTokensRepository = new InMemoryPasswordResetTokensRepository();
  const tokenGenerator = new FakeTokenGenerator();
  const passwordHasher = new FakePasswordHasher();

  const user = await userRepository.create({
    email: "clienta@example.com",
    passwordHash: await passwordHasher.hash("old-password"),
    name: "Clienta",
    role: "client",
  });

  const useCase = new ResetPasswordUseCase(passwordResetTokensRepository, userRepository, tokenGenerator, passwordHasher);

  return { useCase, user, userRepository, passwordResetTokensRepository, tokenGenerator, passwordHasher };
}

describe("ResetPasswordUseCase", () => {
  it("rejects an invalid token", async () => {
    const { useCase } = await setup();

    const result = await useCase.execute({ token: "no-existe", newPassword: "nueva-password" });

    expect(result).toBe("invalid");
  });

  it("rejects an expired token", async () => {
    const { useCase, user, passwordResetTokensRepository, tokenGenerator } = await setup();
    const tokenHash = tokenGenerator.hashToken(tokenGenerator.nextToken);
    await passwordResetTokensRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await useCase.execute({ token: tokenGenerator.nextToken, newPassword: "nueva-password" });

    expect(result).toBe("expired");
  });

  it("rejects a token that was already used", async () => {
    const { useCase, user, passwordResetTokensRepository, tokenGenerator } = await setup();
    const tokenHash = tokenGenerator.hashToken(tokenGenerator.nextToken);
    const record = await passwordResetTokensRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    await passwordResetTokensRepository.markUsed(record.id);

    const result = await useCase.execute({ token: tokenGenerator.nextToken, newPassword: "nueva-password" });

    expect(result).toBe("used");
  });

  it("changes the password and consumes the token on success", async () => {
    const { useCase, user, userRepository, passwordResetTokensRepository, tokenGenerator, passwordHasher } =
      await setup();
    const tokenHash = tokenGenerator.hashToken(tokenGenerator.nextToken);
    const record = await passwordResetTokensRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const result = await useCase.execute({ token: tokenGenerator.nextToken, newPassword: "nueva-password" });

    expect(result).toBe("ok");
    const updatedUser = await userRepository.findById(user.id);
    expect(await passwordHasher.compare("nueva-password", updatedUser!.passwordHash)).toBe(true);
    expect(await passwordHasher.compare("old-password", updatedUser!.passwordHash)).toBe(false);

    const updatedToken = await passwordResetTokensRepository.findByTokenHash(tokenHash);
    expect(updatedToken?.id).toBe(record.id);
    expect(updatedToken?.usedAt).not.toBeNull();
  });

  it("rejects reusing the same token a second time", async () => {
    const { useCase, user, passwordResetTokensRepository, tokenGenerator } = await setup();
    const tokenHash = tokenGenerator.hashToken(tokenGenerator.nextToken);
    await passwordResetTokensRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const first = await useCase.execute({ token: tokenGenerator.nextToken, newPassword: "nueva-password" });
    const second = await useCase.execute({ token: tokenGenerator.nextToken, newPassword: "otra-password" });

    expect(first).toBe("ok");
    expect(second).toBe("used");
  });
});
