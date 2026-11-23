import { describe, expect, it } from "vitest";
import { makeProfessional } from "@/server/application/admin/__fakes__/professional-fixture";
import { FakeTokenGenerator } from "@/server/application/auth/__fakes__/fake-token-generator";
import { InMemoryEmailCodesRepository } from "@/server/application/auth/__fakes__/in-memory-email-codes-repository";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import {
  ClientProfileRequiredError,
  InvalidEmailCodeError,
  RequestLoginCodeUseCase,
  SignInWithEmailCodeUseCase,
  verifyEmailCode,
} from "@/server/application/auth/email-code.use-case";
import { InMemoryBrandingRepository } from "@/server/application/branding/__fakes__/in-memory-branding-repository";
import { FakeEmailSender } from "@/server/application/notification/__fakes__/fake-email-sender";
import { InMemoryProfessionalRepository } from "@/server/application/professional/__fakes__/in-memory-professional-repository";
import { UNUSABLE_PASSWORD_HASH } from "@/server/domain/user/client-contact";

function setup() {
  const users = new InMemoryUserRepository();
  const codes = new InMemoryEmailCodesRepository();
  const tokens = new FakeTokenGenerator();
  const emailSender = new FakeEmailSender();
  const professionals = new InMemoryProfessionalRepository();
  professionals.professionals.push(makeProfessional({ id: "prof-1", slug: "fran", businessName: "Fran Uñas" }));
  const deps = { codes, tokens, professionals, branding: new InMemoryBrandingRepository(), emailSender };
  return {
    users,
    codes,
    tokens,
    emailSender,
    request: new RequestLoginCodeUseCase(users, deps),
    signIn: new SignInWithEmailCodeUseCase(users, codes, tokens),
  };
}

describe("Entrar con código por correo (SPEC 20)", () => {
  it("sends a code to a new email and creates the client on sign-in, verified and without password", async () => {
    const { request, signIn, emailSender, users } = setup();

    const result = await request.execute({ email: "Nueva@Example.com ", slug: "fran" });
    expect(result).toEqual({ status: "sent", isNewClient: true });
    expect(emailSender.sent[0].to).toBe("nueva@example.com");
    expect(emailSender.sent[0].html).toContain("123456");
    expect(emailSender.sent[0].subject).toContain("Fran Uñas");

    const user = await signIn.execute({ email: "nueva@example.com", code: "123456", name: "Ana", phone: "+56 9 1234 5678" });
    expect(user.role).toBe("client");
    expect(user.passwordHash).toBe(UNUSABLE_PASSWORD_HASH);
    expect((await users.findById(user.id))?.emailVerifiedAt).not.toBeNull();
  });

  it("asks a new client for name and phone without burning the code", async () => {
    const { request, signIn } = setup();
    await request.execute({ email: "nueva@example.com", slug: "fran" });

    await expect(signIn.execute({ email: "nueva@example.com", code: "123456" })).rejects.toBeInstanceOf(
      ClientProfileRequiredError,
    );
    await expect(
      signIn.execute({ email: "nueva@example.com", code: "123456", name: "Ana", phone: "+56 9 1234 5678" }),
    ).resolves.toBeDefined();
  });

  it("signs an existing client into her own account", async () => {
    const { request, signIn, users } = setup();
    const existing = await users.create({ email: "cami@example.com", passwordHash: "h", name: "Cami", role: "client" });

    expect((await request.execute({ email: "cami@example.com", slug: "fran" })).isNewClient).toBe(false);
    const user = await signIn.execute({ email: "cami@example.com", code: "123456" });
    expect(user.id).toBe(existing.id);
  });

  it("never sends a code to a professional", async () => {
    const { request, signIn, users, emailSender, codes } = setup();
    await users.create({ email: "fran@example.com", passwordHash: "h", name: "Fran", role: "professional" });

    expect(await request.execute({ email: "fran@example.com", slug: "fran" })).toEqual({ status: "sent", isNewClient: false });
    expect(emailSender.sent).toHaveLength(0);
    // Aunque existiera un código, no entra.
    await codes.create({ email: "fran@example.com", purpose: "login", userId: null, codeHash: "hashed:fran@example.com:123456", expiresAt: new Date(Date.now() + 60_000) });
    await expect(signIn.execute({ email: "fran@example.com", code: "123456" })).rejects.toBeInstanceOf(InvalidEmailCodeError);
  });

  it("does not accept a code twice", async () => {
    const { request, signIn, users } = setup();
    await users.create({ email: "cami@example.com", passwordHash: "h", name: "Cami", role: "client" });
    await request.execute({ email: "cami@example.com", slug: "fran" });

    await signIn.execute({ email: "cami@example.com", code: "123456" });
    await expect(signIn.execute({ email: "cami@example.com", code: "123456" })).rejects.toBeInstanceOf(InvalidEmailCodeError);
  });

  it("rejects an expired code", async () => {
    const { request, codes, tokens } = setup();
    await request.execute({ email: "cami@example.com", slug: "fran" });

    const later = new Date(Date.now() + 11 * 60_000);
    expect(await verifyEmailCode(codes, tokens, { email: "cami@example.com", purpose: "login", userId: null, code: "123456", now: later })).toBe(false);
  });

  it("invalidates the code after 5 wrong attempts, even if the right one comes next", async () => {
    const { request, codes, tokens } = setup();
    await request.execute({ email: "cami@example.com", slug: "fran" });
    const verify = (code: string) => verifyEmailCode(codes, tokens, { email: "cami@example.com", purpose: "login", userId: null, code });

    for (let i = 0; i < 5; i++) expect(await verify("000000")).toBe(false);
    expect(await verify("123456")).toBe(false);
  });

  it("limits to 3 codes per email every 15 minutes", async () => {
    const { request, codes } = setup();
    for (let i = 0; i < 3; i++) expect((await request.execute({ email: "cami@example.com", slug: "fran" })).status).toBe("sent");
    expect((await request.execute({ email: "cami@example.com", slug: "fran" })).status).toBe("rate_limited");

    codes.codes.forEach((c) => (c.createdAt = new Date(Date.now() - 16 * 60_000)));
    expect((await request.execute({ email: "cami@example.com", slug: "fran" })).status).toBe("sent");
  });
});
