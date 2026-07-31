import { describe, expect, it } from "vitest";
import { FakePasswordHasher } from "@/server/application/auth/__fakes__/fake-password-hasher";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import {
  AuthenticateUserUseCase,
  InvalidCredentialsError,
} from "@/server/application/auth/authenticate-user.use-case";

async function makeUseCaseWithExistingUser() {
  const userRepository = new InMemoryUserRepository();
  const passwordHasher = new FakePasswordHasher();
  const useCase = new AuthenticateUserUseCase(userRepository, passwordHasher);

  await userRepository.create({
    email: "cliente@example.com",
    passwordHash: await passwordHasher.hash("correcta"),
    name: "Cliente Test",
    role: "client",
  });

  return { useCase };
}

describe("AuthenticateUserUseCase", () => {
  it("returns the user when the password matches", async () => {
    const { useCase } = await makeUseCaseWithExistingUser();

    const user = await useCase.execute({ email: "cliente@example.com", password: "correcta" });

    expect(user.email).toBe("cliente@example.com");
  });

  it("rejects a wrong password without revealing whether the email exists", async () => {
    const { useCase } = await makeUseCaseWithExistingUser();

    await expect(
      useCase.execute({ email: "cliente@example.com", password: "incorrecta" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("rejects an email that is not registered with the same error", async () => {
    const { useCase } = await makeUseCaseWithExistingUser();

    await expect(
      useCase.execute({ email: "nadie@example.com", password: "cualquiera" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("matches the email case-insensitively", async () => {
    const { useCase } = await makeUseCaseWithExistingUser();

    const user = await useCase.execute({ email: "Cliente@Example.com", password: "correcta" });

    expect(user.email).toBe("cliente@example.com");
  });
});
