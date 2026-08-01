import { describe, expect, it } from "vitest";
import { InMemoryReviewsRepository } from "@/server/application/review/__fakes__/in-memory-reviews-repository";
import { ListReviewsUseCase } from "@/server/application/review/list-reviews.use-case";

const PROFESSIONAL_ID = "prof-1";

async function setup() {
  const reviewsRepository = new InMemoryReviewsRepository();
  const useCase = new ListReviewsUseCase(reviewsRepository);
  return { reviewsRepository, useCase };
}

describe("ListReviewsUseCase", () => {
  it("lists pending reviews before moderated ones", async () => {
    const { reviewsRepository, useCase } = await setup();
    const approved = await reviewsRepository.create({
      professionalId: PROFESSIONAL_ID,
      bookingId: "b1",
      clientUserId: "c1",
      rating: 5,
      body: "Excelente atención en todo momento.",
    });
    await reviewsRepository.update(approved.id, PROFESSIONAL_ID, { status: "approved", moderatedAt: new Date() });
    const pending = await reviewsRepository.create({
      professionalId: PROFESSIONAL_ID,
      bookingId: "b2",
      clientUserId: "c2",
      rating: 4,
      body: "Buena atención, volvería a ir sin duda.",
    });

    const list = await useCase.listForProfessional(PROFESSIONAL_ID);

    expect(list[0].id).toBe(pending.id);
    expect(list[1].id).toBe(approved.id);
  });

  it("only lists approved reviews publicly, most recent first", async () => {
    const { reviewsRepository, useCase } = await setup();
    const rejected = await reviewsRepository.create({
      professionalId: PROFESSIONAL_ID,
      bookingId: "b1",
      clientUserId: "c1",
      rating: 2,
      body: "No cumplió mis expectativas para nada.",
    });
    await reviewsRepository.update(rejected.id, PROFESSIONAL_ID, { status: "rejected", moderatedAt: new Date() });
    const approved = await reviewsRepository.create({
      professionalId: PROFESSIONAL_ID,
      bookingId: "b2",
      clientUserId: "c2",
      rating: 5,
      body: "Quedé encantada con el trabajo realizado.",
    });
    await reviewsRepository.update(approved.id, PROFESSIONAL_ID, { status: "approved", moderatedAt: new Date() });

    const list = await useCase.listPublic(PROFESSIONAL_ID);

    expect(list.map((r) => r.id)).toEqual([approved.id]);
  });

  it("counts only pending reviews", async () => {
    const { reviewsRepository, useCase } = await setup();
    await reviewsRepository.create({
      professionalId: PROFESSIONAL_ID,
      bookingId: "b1",
      clientUserId: "c1",
      rating: 5,
      body: "Muy buena atención, recomendada sin dudar.",
    });
    const approved = await reviewsRepository.create({
      professionalId: PROFESSIONAL_ID,
      bookingId: "b2",
      clientUserId: "c2",
      rating: 4,
      body: "Todo bien, tal como se esperaba de antemano.",
    });
    await reviewsRepository.update(approved.id, PROFESSIONAL_ID, { status: "approved", moderatedAt: new Date() });

    expect(await useCase.countPending(PROFESSIONAL_ID)).toBe(1);
  });
});
