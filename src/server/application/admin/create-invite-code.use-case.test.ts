import { describe, expect, it } from "vitest";
import { InMemoryInviteCodesRepository } from "@/server/application/tenant/__fakes__/in-memory-tenant-provisioning";
import { CreateInviteCodeUseCase } from "@/server/application/admin/create-invite-code.use-case";

const NOW = new Date("2026-08-03T12:00:00Z");

describe("CreateInviteCodeUseCase", () => {
  it("crea un código sin vencimiento cuando expiresInDays es null", async () => {
    const repository = new InMemoryInviteCodesRepository();
    const useCase = new CreateInviteCodeUseCase(repository);

    const code = await useCase.execute({ note: "para Karla", expiresInDays: null }, NOW);

    expect(code.note).toBe("para Karla");
    expect(code.expiresAt).toBeNull();
    expect(code.code).toHaveLength(8);
  });

  it("calcula expiresAt desde expiresInDays", async () => {
    const repository = new InMemoryInviteCodesRepository();
    const useCase = new CreateInviteCodeUseCase(repository);

    const code = await useCase.execute({ note: null, expiresInDays: 7 }, NOW);

    expect(code.expiresAt).toEqual(new Date("2026-08-10T12:00:00Z"));
  });

  it("reintenta si el código generado colisiona", async () => {
    const repository = new InMemoryInviteCodesRepository();
    let attempts = 0;
    const originalCreate = repository.create.bind(repository);
    repository.create = async (input) => {
      attempts++;
      if (attempts === 1) {
        throw new Error("duplicate key value violates unique constraint");
      }
      return originalCreate(input);
    };
    const useCase = new CreateInviteCodeUseCase(repository);

    const code = await useCase.execute({ note: null, expiresInDays: null }, NOW);

    expect(attempts).toBe(2);
    expect(code.code).toHaveLength(8);
  });
});
