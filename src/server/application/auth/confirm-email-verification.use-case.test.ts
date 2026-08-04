import { describe, expect, it } from "vitest";
import { FakeTokenGenerator } from "@/server/application/auth/__fakes__/fake-token-generator";
import { InMemoryEmailVerificationTokensRepository } from "@/server/application/auth/__fakes__/in-memory-email-verification-tokens-repository";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import { InMemoryProfessionalRepository } from "@/server/application/professional/__fakes__/in-memory-professional-repository";
import {
  ConfirmEmailVerificationUseCase,
  InvalidVerificationTokenError,
} from "@/server/application/auth/confirm-email-verification.use-case";
import type { Professional } from "@/server/domain/professional/professional.entity";

function professional(overrides: Partial<Professional> = {}): Professional {
  return {
    id: "professional-1",
    slug: "unas-por-karla",
    ownerUserId: "user-1",
    businessName: "Uñas por Karla",
    vertical: "nails",
    bio: null,
    tagline: null,
    phone: null,
    phoneVisible: true,
    address: null,
    addressVisible: true,
    instagramHandle: null,
    timezone: "America/Santiago",
    active: true,
    publishedAt: null,
    trialEndsAt: null,
    bufferMinutes: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

async function setup() {
  const tokensRepository = new InMemoryEmailVerificationTokensRepository();
  const userRepository = new InMemoryUserRepository();
  const professionalRepository = new InMemoryProfessionalRepository();
  const tokenGenerator = new FakeTokenGenerator();

  const user = await userRepository.create({
    email: "karla@example.com",
    passwordHash: "x",
    name: "Karla",
    role: "professional",
  });

  const useCase = new ConfirmEmailVerificationUseCase(
    tokensRepository,
    userRepository,
    professionalRepository,
    tokenGenerator,
  );

  return { tokensRepository, userRepository, professionalRepository, tokenGenerator, useCase, user };
}

describe("ConfirmEmailVerificationUseCase", () => {
  it("marks the user's email as verified", async () => {
    const { tokensRepository, tokenGenerator, useCase, user, userRepository } = await setup();
    await tokensRepository.create({
      userId: user.id,
      tokenHash: tokenGenerator.hashToken("raw-token"),
      expiresAt: new Date(Date.now() + 1000),
    });

    await useCase.execute("raw-token");

    const updated = await userRepository.findById(user.id);
    expect(updated?.emailVerifiedAt).not.toBeNull();
  });

  it("publishes the tenant she owns", async () => {
    const { tokensRepository, tokenGenerator, useCase, user, professionalRepository } = await setup();
    professionalRepository.professionals.push(professional({ ownerUserId: user.id }));
    await tokensRepository.create({
      userId: user.id,
      tokenHash: tokenGenerator.hashToken("raw-token"),
      expiresAt: new Date(Date.now() + 1000),
    });

    await useCase.execute("raw-token");

    expect(professionalRepository.professionals[0].publishedAt).not.toBeNull();
  });

  it("does nothing to the tenant when the user does not own one", async () => {
    const { tokensRepository, tokenGenerator, useCase } = await setup();
    await tokensRepository.create({
      userId: "user-1",
      tokenHash: tokenGenerator.hashToken("raw-token"),
      expiresAt: new Date(Date.now() + 1000),
    });

    await expect(useCase.execute("raw-token")).resolves.toBeUndefined();
  });

  it("marks the token as used so it cannot be replayed", async () => {
    const { tokensRepository, tokenGenerator, useCase, user } = await setup();
    await tokensRepository.create({
      userId: user.id,
      tokenHash: tokenGenerator.hashToken("raw-token"),
      expiresAt: new Date(Date.now() + 1000),
    });

    await useCase.execute("raw-token");

    await expect(useCase.execute("raw-token")).rejects.toThrow(InvalidVerificationTokenError);
  });

  it("rejects an unknown token", async () => {
    const { useCase } = await setup();
    await expect(useCase.execute("does-not-exist")).rejects.toThrow(InvalidVerificationTokenError);
  });

  it("rejects an expired token", async () => {
    const { tokensRepository, tokenGenerator, useCase, user } = await setup();
    await tokensRepository.create({
      userId: user.id,
      tokenHash: tokenGenerator.hashToken("raw-token"),
      expiresAt: new Date("2020-01-01T00:00:00Z"),
    });

    await expect(useCase.execute("raw-token", new Date("2026-01-01T00:00:00Z"))).rejects.toThrow(
      InvalidVerificationTokenError,
    );
  });
});
