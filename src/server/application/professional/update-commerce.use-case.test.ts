import { describe, expect, it } from "vitest";
import { InMemoryProfessionalRepository } from "@/server/application/professional/__fakes__/in-memory-professional-repository";
import {
  InvalidCommerceSettingsError,
  UpdateCommerceUseCase,
} from "@/server/application/professional/update-commerce.use-case";
import { makeProfessional as buildProfessional } from "@/server/application/admin/__fakes__/professional-fixture";
import { DEFAULT_PROFESSIONAL_COMMERCE } from "@/server/domain/professional/commerce";

const BANK = {
  bank: " BancoEstado ",
  accountType: "Cuenta RUT",
  accountNumber: "12345678",
  holderName: "Fran",
  holderRut: "12.345.678-9",
  email: "fran@x.cl",
};

function setup() {
  const repo = new InMemoryProfessionalRepository();
  repo.professionals.push(buildProfessional({ id: "prof-1" }));
  return { repo, useCase: new UpdateCommerceUseCase(repo) };
}

describe("UpdateCommerceUseCase", () => {
  it("saves a deposit with complete, trimmed bank details", async () => {
    const { useCase } = setup();
    const saved = await useCase.execute("prof-1", { ...DEFAULT_PROFESSIONAL_COMMERCE, depositClp: 5000, bankDetails: BANK });
    expect(saved.commerce.depositClp).toBe(5000);
    expect(saved.commerce.bankDetails?.bank).toBe("BancoEstado");
  });

  it("rejects a deposit without bank details or out of range", async () => {
    const { useCase } = setup();
    await expect(useCase.execute("prof-1", { ...DEFAULT_PROFESSIONAL_COMMERCE, depositClp: 5000 })).rejects.toThrow(
      InvalidCommerceSettingsError,
    );
    await expect(
      useCase.execute("prof-1", { ...DEFAULT_PROFESSIONAL_COMMERCE, depositClp: 500, bankDetails: BANK }),
    ).rejects.toThrow(InvalidCommerceSettingsError);
  });

  it("keeps bank details when the deposit is turned off and validates rebook days", async () => {
    const { useCase } = setup();
    const saved = await useCase.execute("prof-1", { ...DEFAULT_PROFESSIONAL_COMMERCE, bankDetails: BANK, rebookAfterDays: 21 });
    expect(saved.commerce.depositClp).toBeNull();
    expect(saved.commerce.bankDetails).not.toBeNull();
    expect(saved.commerce.rebookAfterDays).toBe(21);
    await expect(useCase.execute("prof-1", { ...DEFAULT_PROFESSIONAL_COMMERCE, rebookAfterDays: 3 })).rejects.toThrow(
      InvalidCommerceSettingsError,
    );
  });
});
