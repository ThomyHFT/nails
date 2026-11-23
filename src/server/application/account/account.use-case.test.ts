import { describe, expect, it } from "vitest";
import { makeProfessional } from "@/server/application/admin/__fakes__/professional-fixture";
import { FakePasswordHasher } from "@/server/application/auth/__fakes__/fake-password-hasher";
import { FakeTokenGenerator } from "@/server/application/auth/__fakes__/fake-token-generator";
import { InMemoryEmailCodesRepository } from "@/server/application/auth/__fakes__/in-memory-email-codes-repository";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import {
  AccountValidationError,
  ChangePasswordUseCase,
  ConfirmEmailChangeUseCase,
  EmailTakenError,
  RequestEmailChangeUseCase,
  UpdateContactUseCase,
  WrongCurrentPasswordError,
} from "@/server/application/account/account.use-case";
import { InMemoryBrandingRepository } from "@/server/application/branding/__fakes__/in-memory-branding-repository";
import { FakeEmailSender } from "@/server/application/notification/__fakes__/fake-email-sender";
import { InMemoryProfessionalRepository } from "@/server/application/professional/__fakes__/in-memory-professional-repository";
import { UNUSABLE_PASSWORD_HASH } from "@/server/domain/user/client-contact";

async function setup(passwordHash = "hashed:vieja-clave") {
  const users = new InMemoryUserRepository();
  const hasher = new FakePasswordHasher();
  const codes = new InMemoryEmailCodesRepository();
  const tokens = new FakeTokenGenerator();
  const emailSender = new FakeEmailSender();
  const professionals = new InMemoryProfessionalRepository();
  professionals.professionals.push(makeProfessional({ slug: "fran" }));
  const user = await users.create({ email: "cami@example.com", passwordHash, name: "Cami", role: "client" });
  const deps = { codes, tokens, professionals, branding: new InMemoryBrandingRepository(), emailSender };
  return {
    users,
    user,
    emailSender,
    contact: new UpdateContactUseCase(users),
    password: new ChangePasswordUseCase(users, hasher),
    requestEmail: new RequestEmailChangeUseCase(users, deps),
    confirmEmail: new ConfirmEmailChangeUseCase(users, codes, tokens),
  };
}

describe("Cuenta (SPEC 20)", () => {
  it("updates name and phone, validating the phone", async () => {
    const { contact, users, user } = await setup();
    await expect(contact.execute(user.id, { name: "Camila", phone: "123" })).rejects.toBeInstanceOf(AccountValidationError);

    await contact.execute(user.id, { name: " Camila ", phone: "+56 9 1234 5678" });
    expect(await users.findById(user.id)).toMatchObject({ name: "Camila", phone: "+56 9 1234 5678" });
  });

  it("requires the current password to change it", async () => {
    const { password, users, user } = await setup();
    await expect(password.execute(user.id, { currentPassword: "otra", newPassword: "nueva-clave" })).rejects.toBeInstanceOf(
      WrongCurrentPasswordError,
    );

    await password.execute(user.id, { currentPassword: "vieja-clave", newPassword: "nueva-clave" });
    expect((await users.findById(user.id))?.passwordHash).toBe("hashed:nueva-clave");
  });

  it("lets an account without password create one", async () => {
    const { password, users, user } = await setup(UNUSABLE_PASSWORD_HASH);

    await password.execute(user.id, { newPassword: "primera-clave" });
    expect((await users.findById(user.id))?.passwordHash).toBe("hashed:primera-clave");
  });

  it("rejects a password under 8 characters", async () => {
    const { password, user } = await setup(UNUSABLE_PASSWORD_HASH);
    await expect(password.execute(user.id, { newPassword: "corta" })).rejects.toBeInstanceOf(AccountValidationError);
  });

  it("changes the email only with the code sent to the new address", async () => {
    const { requestEmail, confirmEmail, users, user, emailSender } = await setup();

    expect(await requestEmail.execute(user.id, { newEmail: "Nueva@Example.com", slug: "fran" })).toBe("sent");
    expect(emailSender.sent[0].to).toBe("nueva@example.com");

    await expect(confirmEmail.execute(user.id, { newEmail: "nueva@example.com", code: "000000" })).rejects.toBeInstanceOf(
      AccountValidationError,
    );
    expect((await users.findById(user.id))?.email).toBe("cami@example.com");

    await confirmEmail.execute(user.id, { newEmail: "nueva@example.com", code: "123456" });
    const updated = await users.findById(user.id);
    expect(updated?.email).toBe("nueva@example.com");
    expect(updated?.emailVerifiedAt).not.toBeNull();
  });

  it("does not take an email another account uses", async () => {
    const { requestEmail, users, user } = await setup();
    await users.create({ email: "ocupado@example.com", passwordHash: "h", name: "Otra", role: "client" });

    await expect(requestEmail.execute(user.id, { newEmail: "ocupado@example.com", slug: "fran" })).rejects.toBeInstanceOf(
      EmailTakenError,
    );
  });

  it("does not accept a login code to change the email", async () => {
    const { users, user } = await setup();
    // Un código de entrada al correo nuevo no sirve para cambiar el correo de otra cuenta.
    const codes = new InMemoryEmailCodesRepository();
    await codes.create({ email: "nueva@example.com", purpose: "login", userId: null, codeHash: "hashed:nueva@example.com:123456", expiresAt: new Date(Date.now() + 60_000) });
    const other = new ConfirmEmailChangeUseCase(users, codes, new FakeTokenGenerator());

    await expect(other.execute(user.id, { newEmail: "nueva@example.com", code: "123456" })).rejects.toBeInstanceOf(
      AccountValidationError,
    );
  });
});
