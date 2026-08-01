import { describe, expect, it } from "vitest";
import { InMemoryPortfolioRepository } from "@/server/application/portfolio/__fakes__/in-memory-portfolio-repository";
import { ListPortfolioUseCase } from "@/server/application/portfolio/list-portfolio.use-case";

const PROFESSIONAL_ID = "prof-1";

describe("ListPortfolioUseCase", () => {
  it("returns every item for the professional when onlyPublished is not set", async () => {
    const repository = new InMemoryPortfolioRepository();
    const useCase = new ListPortfolioUseCase(repository);
    const published = await repository.create({ professionalId: PROFESSIONAL_ID, imageUrl: "https://a.jpg" });
    const unpublished = await repository.create({ professionalId: PROFESSIONAL_ID, imageUrl: "https://b.jpg" });
    await repository.update(published.id, PROFESSIONAL_ID, { published: true });

    const items = await useCase.execute(PROFESSIONAL_ID);

    expect(items.map((i) => i.id).sort()).toEqual([published.id, unpublished.id].sort());
  });

  it("returns only published items when onlyPublished is true", async () => {
    const repository = new InMemoryPortfolioRepository();
    const useCase = new ListPortfolioUseCase(repository);
    const published = await repository.create({ professionalId: PROFESSIONAL_ID, imageUrl: "https://a.jpg" });
    await repository.create({ professionalId: PROFESSIONAL_ID, imageUrl: "https://b.jpg" });
    await repository.update(published.id, PROFESSIONAL_ID, { published: true });

    const items = await useCase.execute(PROFESSIONAL_ID, { onlyPublished: true });

    expect(items.map((i) => i.id)).toEqual([published.id]);
  });

  it("does not leak items from other professionals", async () => {
    const repository = new InMemoryPortfolioRepository();
    const useCase = new ListPortfolioUseCase(repository);
    await repository.create({ professionalId: "other-prof", imageUrl: "https://a.jpg" });

    const items = await useCase.execute(PROFESSIONAL_ID, { onlyPublished: true });

    expect(items).toEqual([]);
  });
});
