import { describe, expect, it } from "vitest";
import { FakePasswordHasher } from "@/server/application/auth/__fakes__/fake-password-hasher";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import {
  EmailAlreadyRegisteredError,
  InvalidPhoneError,
  RegisterClientUseCase,
} from "@/server/application/auth/register-client.use-case";
import { UNUSABLE_PASSWORD_HASH } from "@/server/domain/user/client-contact";

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
      phone: "+56 9 1234 5678",
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
      phone: "+56 9 1234 5678",
    });

    expect(user.email).toBe("cliente@example.com");
  });

  it("creates the user with role client", async () => {
    const { useCase } = makeUseCase();

    const user = await useCase.execute({
      email: "cliente@example.com",
      password: "super-secreta",
      name: "Cliente Test",
      phone: "+56 9 1234 5678",
    });

    expect(user.role).toBe("client");
  });

  it("rejects a second registration with the same email", async () => {
    const { useCase } = makeUseCase();

    await useCase.execute({
      email: "cliente@example.com",
      password: "super-secreta",
      name: "Cliente Test",
      phone: "+56 9 1234 5678",
    });

    await expect(
      useCase.execute({
        email: "cliente@example.com",
        password: "otra-clave",
        name: "Otro Nombre",
        phone: "+56 9 1111 2222",
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
  });

  it("rejects a phone without enough digits", async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.execute({ email: "c@example.com", password: "super-secreta", name: "Cliente", phone: "123" }),
    ).rejects.toBeInstanceOf(InvalidPhoneError);
  });

  it("activates an account the professional created by hand instead of rejecting the email", async () => {
    const { useCase, userRepository } = makeUseCase();
    const manual = await userRepository.create({
      email: "camila@example.com",
      passwordHash: UNUSABLE_PASSWORD_HASH,
      name: "Cami",
      phone: null,
      role: "client",
    });

    const user = await useCase.execute({
      email: "camila@example.com",
      password: "super-secreta",
      name: "Camila Rojas",
      phone: "+56 9 8765 4321",
    });

    expect(user.id).toBe(manual.id);
    const stored = await userRepository.findById(manual.id);
    expect(stored?.passwordHash).toBe("hashed:super-secreta");
    expect(stored?.name).toBe("Camila Rojas");
    expect(stored?.phone).toBe("+56 9 8765 4321");
  });
});
