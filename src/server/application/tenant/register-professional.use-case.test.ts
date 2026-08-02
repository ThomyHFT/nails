import { describe, expect, it } from "vitest";
import { FakePasswordHasher } from "@/server/application/auth/__fakes__/fake-password-hasher";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import { InMemoryProfessionalRepository } from "@/server/application/professional/__fakes__/in-memory-professional-repository";
import {
  InMemoryInviteCodesRepository,
  InMemoryTenantProvisioningRepository,
} from "@/server/application/tenant/__fakes__/in-memory-tenant-provisioning";
import {
  BusinessNameRequiredError,
  EmailTakenError,
  InvalidSlugFormatError,
  InviteCodeInvalidError,
  RegisterProfessionalUseCase,
  SlugUnavailableError,
  TRIAL_DAYS,
  WeakPasswordError,
} from "@/server/application/tenant/register-professional.use-case";

function setup() {
  const inviteCodesRepository = new InMemoryInviteCodesRepository();
  const userRepository = new InMemoryUserRepository();
  const professionalRepository = new InMemoryProfessionalRepository();
  const tenantProvisioningRepository = new InMemoryTenantProvisioningRepository();
  const passwordHasher = new FakePasswordHasher();

  const useCase = new RegisterProfessionalUseCase(
    inviteCodesRepository,
    userRepository,
    professionalRepository,
    tenantProvisioningRepository,
    passwordHasher,
  );

  return { inviteCodesRepository, userRepository, professionalRepository, tenantProvisioningRepository, useCase };
}

function validInput(overrides: Partial<Parameters<RegisterProfessionalUseCase["execute"]>[0]> = {}) {
  return {
    inviteCode: "WELCOME1",
    slug: "unas-por-karla",
    businessName: "Uñas por Karla",
    name: "Karla",
    email: "karla@example.com",
    password: "password123",
    ...overrides,
  };
}

describe("RegisterProfessionalUseCase", () => {
  it("provisions the tenant with a valid invite code", async () => {
    const { inviteCodesRepository, useCase, tenantProvisioningRepository } = setup();
    inviteCodesRepository.add({ code: "WELCOME1" });

    const now = new Date("2026-01-01T00:00:00Z");
    const result = await useCase.execute(validInput(), now);

    expect(result.professional.slug).toBe("unas-por-karla");
    expect(result.professional.publishedAt).toBeNull();
    expect(tenantProvisioningRepository.provisioned).toHaveLength(1);
  });

  it("sets the trial to expire TRIAL_DAYS from now", async () => {
    const { inviteCodesRepository, useCase } = setup();
    inviteCodesRepository.add({ code: "WELCOME1" });

    const now = new Date("2026-01-01T00:00:00Z");
    const result = await useCase.execute(validInput(), now);

    const expected = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    expect(result.professional.trialEndsAt).toEqual(expected);
  });

  it("marks the invite code as used in the provisioning call", async () => {
    const { inviteCodesRepository, useCase, tenantProvisioningRepository } = setup();
    const code = inviteCodesRepository.add({ code: "WELCOME1" });

    await useCase.execute(validInput(), new Date());

    expect(tenantProvisioningRepository.provisioned[0].inviteCodeId).toBe(code.id);
  });

  it("normalizes slug and email to lowercase", async () => {
    const { inviteCodesRepository, useCase } = setup();
    inviteCodesRepository.add({ code: "WELCOME1" });

    const result = await useCase.execute(
      validInput({ slug: "Unas-Por-Karla", email: "KARLA@Example.com" }),
      new Date(),
    );

    expect(result.professional.slug).toBe("unas-por-karla");
  });

  it("rejects a slug with an invalid format before touching the invite code", async () => {
    const { inviteCodesRepository, useCase } = setup();

    await expect(useCase.execute(validInput({ slug: "Ab" }), new Date())).rejects.toThrow(InvalidSlugFormatError);
    // Nunca debería haber consultado el código: el chequeo puro y barato va primero.
    expect(inviteCodesRepository.codes).toHaveLength(0);
  });

  it("rejects a reserved slug with the same error as a taken one", async () => {
    const { inviteCodesRepository, useCase } = setup();
    inviteCodesRepository.add({ code: "WELCOME1" });

    await expect(useCase.execute(validInput({ slug: "admin" }), new Date())).rejects.toThrow(SlugUnavailableError);
  });

  it("rejects an empty business name", async () => {
    const { useCase } = setup();
    await expect(useCase.execute(validInput({ businessName: "   " }), new Date())).rejects.toThrow(
      BusinessNameRequiredError,
    );
  });

  it("rejects a password shorter than the minimum", async () => {
    const { useCase } = setup();
    await expect(useCase.execute(validInput({ password: "short" }), new Date())).rejects.toThrow(WeakPasswordError);
  });

  it("rejects a missing invite code", async () => {
    const { useCase } = setup();
    await expect(useCase.execute(validInput({ inviteCode: "NOPE" }), new Date())).rejects.toThrow(
      InviteCodeInvalidError,
    );
  });

  it("rejects an already-used invite code", async () => {
    const { inviteCodesRepository, useCase } = setup();
    inviteCodesRepository.add({ code: "WELCOME1", usedByProfessionalId: "professional-1", usedAt: new Date() });

    await expect(useCase.execute(validInput(), new Date())).rejects.toThrow(InviteCodeInvalidError);
  });

  it("rejects an expired invite code", async () => {
    const { inviteCodesRepository, useCase } = setup();
    inviteCodesRepository.add({ code: "WELCOME1", expiresAt: new Date("2020-01-01T00:00:00Z") });

    await expect(useCase.execute(validInput(), new Date("2026-01-01T00:00:00Z"))).rejects.toThrow(
      InviteCodeInvalidError,
    );
  });

  it("accepts an invite code with no expiry", async () => {
    const { inviteCodesRepository, useCase } = setup();
    inviteCodesRepository.add({ code: "WELCOME1", expiresAt: null });

    await expect(useCase.execute(validInput(), new Date())).resolves.toBeDefined();
  });

  it("rejects a slug already taken by another professional", async () => {
    const { inviteCodesRepository, professionalRepository, useCase } = setup();
    inviteCodesRepository.add({ code: "WELCOME1" });
    professionalRepository.professionals.push({
      id: "existing",
      slug: "unas-por-karla",
      ownerUserId: "owner-existing",
      businessName: "Otra",
      bio: null,
      tagline: null,
      phone: null,
      instagramHandle: null,
      timezone: "America/Santiago",
      active: true,
      publishedAt: new Date(),
      trialEndsAt: null,
      bufferMinutes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(useCase.execute(validInput(), new Date())).rejects.toThrow(SlugUnavailableError);
  });

  it("rejects an email already registered", async () => {
    const { inviteCodesRepository, userRepository, useCase } = setup();
    inviteCodesRepository.add({ code: "WELCOME1" });
    await userRepository.create({
      email: "karla@example.com",
      passwordHash: "x",
      name: "Karla existente",
      role: "professional",
    });

    await expect(useCase.execute(validInput(), new Date())).rejects.toThrow(EmailTakenError);
  });

  it("hashes the password before provisioning", async () => {
    const { inviteCodesRepository, useCase, tenantProvisioningRepository } = setup();
    inviteCodesRepository.add({ code: "WELCOME1" });

    await useCase.execute(validInput({ password: "password123" }), new Date());

    expect(tenantProvisioningRepository.provisioned[0].owner.passwordHash).toBe("hashed:password123");
  });
});
