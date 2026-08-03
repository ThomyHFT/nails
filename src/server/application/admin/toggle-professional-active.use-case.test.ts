import { describe, expect, it } from "vitest";
import { InMemoryProfessionalRepository } from "@/server/application/professional/__fakes__/in-memory-professional-repository";
import { makeProfessional } from "@/server/application/admin/__fakes__/professional-fixture";
import {
  ProfessionalNotFoundError,
  ToggleProfessionalActiveUseCase,
} from "@/server/application/admin/toggle-professional-active.use-case";

describe("ToggleProfessionalActiveUseCase", () => {
  it("desactiva una profesional activa", async () => {
    const repository = new InMemoryProfessionalRepository();
    repository.professionals.push(makeProfessional({ active: true }));
    const useCase = new ToggleProfessionalActiveUseCase(repository);

    const updated = await useCase.execute("professional-1", false);

    expect(updated.active).toBe(false);
  });

  it("reactiva una profesional desactivada", async () => {
    const repository = new InMemoryProfessionalRepository();
    repository.professionals.push(makeProfessional({ active: false }));
    const useCase = new ToggleProfessionalActiveUseCase(repository);

    const updated = await useCase.execute("professional-1", true);

    expect(updated.active).toBe(true);
  });

  it("rechaza un id inexistente", async () => {
    const repository = new InMemoryProfessionalRepository();
    const useCase = new ToggleProfessionalActiveUseCase(repository);

    await expect(useCase.execute("no-existe", false)).rejects.toThrow(ProfessionalNotFoundError);
  });
});
