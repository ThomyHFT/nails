import { describe, expect, it } from "vitest";
import { FakeEmailSender } from "@/server/application/notification/__fakes__/fake-email-sender";
import { FakeTokenGenerator } from "@/server/application/auth/__fakes__/fake-token-generator";
import { InMemoryEmailVerificationTokensRepository } from "@/server/application/auth/__fakes__/in-memory-email-verification-tokens-repository";
import { SendEmailVerificationUseCase } from "@/server/application/auth/send-email-verification.use-case";

function setup() {
  const tokensRepository = new InMemoryEmailVerificationTokensRepository();
  const tokenGenerator = new FakeTokenGenerator();
  const emailSender = new FakeEmailSender();
  const useCase = new SendEmailVerificationUseCase(tokensRepository, tokenGenerator, emailSender);
  return { tokensRepository, tokenGenerator, emailSender, useCase };
}

const input = { userId: "user-1", email: "karla@example.com", businessName: "Uñas por Karla", baseUrl: "https://misunas.cl" };

describe("SendEmailVerificationUseCase", () => {
  it("sends the email and stores a token", async () => {
    const { useCase, emailSender, tokensRepository } = setup();

    const result = await useCase.execute(input);

    expect(result).toBe("sent");
    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0].to).toBe("karla@example.com");
    expect(tokensRepository.tokens).toHaveLength(1);
  });

  it("puts the raw token in the link and only the hash in storage", async () => {
    const { useCase, emailSender, tokensRepository, tokenGenerator } = setup();

    await useCase.execute(input);

    expect(emailSender.sent[0].html).toContain(`/verificar/${tokenGenerator.nextToken}`);
    expect(tokensRepository.tokens[0].tokenHash).toBe(tokenGenerator.hashToken(tokenGenerator.nextToken));
  });

  it("returns no_sender without touching the repository when there is no email sender configured", async () => {
    const tokensRepository = new InMemoryEmailVerificationTokensRepository();
    const useCase = new SendEmailVerificationUseCase(tokensRepository, new FakeTokenGenerator(), null);

    const result = await useCase.execute(input);

    expect(result).toBe("no_sender");
    expect(tokensRepository.tokens).toHaveLength(0);
  });

  it("rate limits after three sends within an hour", async () => {
    const { useCase } = setup();

    await useCase.execute(input);
    await useCase.execute(input);
    await useCase.execute(input);
    const fourth = await useCase.execute(input);

    expect(fourth).toBe("rate_limited");
  });
});
