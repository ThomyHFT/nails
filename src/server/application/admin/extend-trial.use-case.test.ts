import { describe, expect, it } from "vitest";
import { InMemoryProfessionalRepository } from "@/server/application/professional/__fakes__/in-memory-professional-repository";
import { makeProfessional } from "@/server/application/admin/__fakes__/professional-fixture";
import { ExtendTrialUseCase } from "@/server/application/admin/extend-trial.use-case";
import { ProfessionalNotFoundError } from "@/server/application/admin/toggle-professional-active.use-case";

const NOW = new Date("2026-08-03T12:00:00Z");

describe("ExtendTrialUseCase", () => {
  it("extiende desde ahora cuando la prueba ya venció", async () => {
    const repository = new InMemoryProfessionalRepository();
    repository.professionals.push(
      makeProfessional({ trialEndsAt: new Date("2026-07-01T00:00:00Z") }),
    );
    const useCase = new ExtendTrialUseCase(repository);

    const updated = await useCase.execute("professional-1", 7, NOW);

    expect(updated.trialEndsAt).toEqual(new Date("2026-08-10T12:00:00Z"));
  });

  it("extiende desde el vencimiento actual cuando todavía no vence, sin perder días otorgados", async () => {
    const repository = new InMemoryProfessionalRepository();
    repository.professionals.push(
      makeProfessional({ trialEndsAt: new Date("2026-08-20T00:00:00Z") }),
    );
    const useCase = new ExtendTrialUseCase(repository);

    const updated = await useCase.execute("professional-1", 7, NOW);

    expect(updated.trialEndsAt).toEqual(new Date("2026-08-27T00:00:00Z"));
  });

  it("quita el vencimiento cuando days es null", async () => {
    const repository = new InMemoryProfessionalRepository();
    repository.professionals.push(
      makeProfessional({ trialEndsAt: new Date("2026-08-20T00:00:00Z") }),
    );
    const useCase = new ExtendTrialUseCase(repository);

    const updated = await useCase.execute("professional-1", null, NOW);

    expect(updated.trialEndsAt).toBeNull();
  });

  it("rechaza un id inexistente", async () => {
    const repository = new InMemoryProfessionalRepository();
    const useCase = new ExtendTrialUseCase(repository);

    await expect(useCase.execute("no-existe", 7, NOW)).rejects.toThrow(ProfessionalNotFoundError);
  });
});
