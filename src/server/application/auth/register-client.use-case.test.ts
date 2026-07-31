import { describe, expect, it } from "vitest";
import { FakePasswordHasher } from "@/server/application/auth/__fakes__/fake-password-hasher";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import {
  EmailAlreadyRegisteredError,
  RegisterClientUseCase,
} from "@/server/application/auth/register-client.use-case";

function makeUseCase() {
  const userRepository = new InMemoryUserRepository();
  const passwordHasher = new FakePasswordHasher();
  const useCase = new RegisterClientUseCase(userRepository, passwordHasher);
  return { useCase, userRepository, passwordHasher };
}

describe("RegisterClientUseCase", () => {
  it("hashes the password before saving, never storing the plain text", async () => {
    const { useCase } = makeUseCase();

    const user = await useCase.execute({
      email: "cliente@example.com",
      password: "super-secreta",
      name: "Cliente Test",
    });

    expect(user.passwordHash).not.toBe("super-secreta");
    expect(user.passwordHash).toBe("hashed:super-secreta");
  });

  it("normalizes the email to lowercase", async () => {
    const { useCase } = makeUseCase();

    const user = await useCase.execute({
      email: "Cliente@Example.COM",
      password: "super-secreta",
      name: "Cliente Test",
    });

    expect(user.email).toBe("cliente@example.com");
  });

  it("creates the user with role client", async () => {
    const { useCase } = makeUseCase();

    const user = await useCase.execute({
      email: "cliente@example.com",
      password: "super-secreta",
      name: "Cliente Test",
    });

    expect(user.role).toBe("client");
  });

  it("rejects a second registration with the same email", async () => {
    const { useCase } = makeUseCase();

    await useCase.execute({
      email: "cliente@example.com",
      password: "super-secreta",
      name: "Cliente Test",
    });

    await expect(
      useCase.execute({
        email: "cliente@example.com",
        password: "otra-clave",
        name: "Otro Nombre",
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
  });
});
