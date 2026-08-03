import { describe, expect, it } from "vitest";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import { FakeTokenGenerator } from "@/server/application/auth/__fakes__/fake-token-generator";
import { InMemoryPasswordResetTokensRepository } from "@/server/application/auth/__fakes__/in-memory-password-reset-tokens-repository";
import { InMemoryBrandingRepository } from "@/server/application/branding/__fakes__/in-memory-branding-repository";
import { FakeEmailSender } from "@/server/application/notification/__fakes__/fake-email-sender";
import { InMemoryProfessionalRepository } from "@/server/application/professional/__fakes__/in-memory-professional-repository";
import { RequestPasswordResetUseCase } from "@/server/application/auth/request-password-reset.use-case";

async function setup() {
  const userRepository = new InMemoryUserRepository();
  const professionalRepository = new InMemoryProfessionalRepository();
  const brandingRepository = new InMemoryBrandingRepository();
  const passwordResetTokensRepository = new InMemoryPasswordResetTokensRepository();
  const tokenGenerator = new FakeTokenGenerator();
  const emailSender = new FakeEmailSender();

  const user = await userRepository.create({
    email: "clienta@example.com",
    passwordHash: "hash",
    name: "Clienta",
    role: "client",
  });

  professionalRepository.professionals.push({
    id: "prof-1",
    slug: "fran-unas",
    ownerUserId: "owner-1",
    businessName: "Fran Uñas",
    bio: null,
    tagline: null,
    phone: null,
    phoneVisible: true,
    address: null,
    addressVisible: true,
    instagramHandle: null,
    timezone: "America/Santiago",
    active: true,
    publishedAt: new Date("2026-01-01T00:00:00Z"),
    trialEndsAt: null,
    bufferMinutes: 15,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const useCase = new RequestPasswordResetUseCase(
    userRepository,
    professionalRepository,
    brandingRepository,
    passwordResetTokensRepository,
    tokenGenerator,
    emailSender,
  );

  return { useCase, user, passwordResetTokensRepository, emailSender };
}

describe("RequestPasswordResetUseCase", () => {
  it("creates a token and sends the email for an existing email", async () => {
    const { useCase, user, passwordResetTokensRepository, emailSender } = await setup();

    const result = await useCase.execute({ email: user.email, slug: "fran-unas", baseUrl: "http://localhost:3000" });

    expect(result).toBe("ok");
    expect(passwordResetTokensRepository.tokens).toHaveLength(1);
    expect(passwordResetTokensRepository.tokens[0]?.userId).toBe(user.id);
    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0]?.to).toBe(user.email);
  });

  it("returns the same result and does nothing observable for an unknown email", async () => {
    const { useCase, passwordResetTokensRepository, emailSender } = await setup();

    const result = await useCase.execute({
      email: "no-existe@example.com",
      slug: "fran-unas",
      baseUrl: "http://localhost:3000",
    });

    expect(result).toBe("ok");
    expect(passwordResetTokensRepository.tokens).toHaveLength(0);
    expect(emailSender.sent).toHaveLength(0);
  });

  it("rejects the fourth request within an hour for the same account", async () => {
    const { useCase, user } = await setup();

    await useCase.execute({ email: user.email, slug: "fran-unas", baseUrl: "http://localhost:3000" });
    await useCase.execute({ email: user.email, slug: "fran-unas", baseUrl: "http://localhost:3000" });
    await useCase.execute({ email: user.email, slug: "fran-unas", baseUrl: "http://localhost:3000" });
    const fourth = await useCase.execute({ email: user.email, slug: "fran-unas", baseUrl: "http://localhost:3000" });

    expect(fourth).toBe("rate_limited");
  });

  it("does not throw and returns ok when there is no email sender configured", async () => {
    const { user, passwordResetTokensRepository } = await setup();
    const userRepository = new InMemoryUserRepository();
    await userRepository.create({ email: user.email, passwordHash: "hash", name: "Clienta", role: "client" });
    const professionalRepository = new InMemoryProfessionalRepository();
    professionalRepository.professionals.push({
      id: "prof-1",
      slug: "fran-unas",
      ownerUserId: "owner-1",
      businessName: "Fran Uñas",
      bio: null,
      tagline: null,
      phone: null,
      phoneVisible: true,
      address: null,
      addressVisible: true,
      instagramHandle: null,
      timezone: "America/Santiago",
      active: true,
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      trialEndsAt: null,
      bufferMinutes: 15,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const useCaseWithoutSender = new RequestPasswordResetUseCase(
      userRepository,
      professionalRepository,
      new InMemoryBrandingRepository(),
      passwordResetTokensRepository,
      new FakeTokenGenerator(),
      null,
    );

    const result = await useCaseWithoutSender.execute({
      email: user.email,
      slug: "fran-unas",
      baseUrl: "http://localhost:3000",
    });

    expect(result).toBe("ok");
  });
});
