import { describe, expect, it } from "vitest";
import { InMemoryReviewsRepository } from "@/server/application/review/__fakes__/in-memory-reviews-repository";
import { ModerateReviewUseCase } from "@/server/application/review/moderate-review.use-case";
import { ReviewNotFoundError } from "@/server/application/review/review-errors";

const PROFESSIONAL_ID = "prof-1";

async function setup() {
  const reviewsRepository = new InMemoryReviewsRepository();
  const useCase = new ModerateReviewUseCase(reviewsRepository);
  const review = await reviewsRepository.create({
    professionalId: PROFESSIONAL_ID,
    bookingId: "booking-1",
    clientUserId: "client-1",
    rating: 5,
    body: "Muy buena atención, quedé feliz con el resultado.",
  });
  return { reviewsRepository, useCase, review };
}

describe("ModerateReviewUseCase", () => {
  it("approves a pending review and stamps moderatedAt", async () => {
    const { useCase, review } = await setup();

    const approved = await useCase.approve(review.id, PROFESSIONAL_ID);

    expect(approved.status).toBe("approved");
    expect(approved.moderatedAt).not.toBeNull();
  });

  it("rejects a pending review and stamps moderatedAt", async () => {
    const { useCase, review } = await setup();

    const rejected = await useCase.reject(review.id, PROFESSIONAL_ID);

    expect(rejected.status).toBe("rejected");
    expect(rejected.moderatedAt).not.toBeNull();
  });

  it("reverts an approved review back to rejected", async () => {
    const { useCase, review } = await setup();
    await useCase.approve(review.id, PROFESSIONAL_ID);

    const reverted = await useCase.reject(review.id, PROFESSIONAL_ID);

    expect(reverted.status).toBe("rejected");
  });

  it("reverts a rejected review back to approved", async () => {
    const { useCase, review } = await setup();
    await useCase.reject(review.id, PROFESSIONAL_ID);

    const reverted = await useCase.approve(review.id, PROFESSIONAL_ID);

    expect(reverted.status).toBe("approved");
  });

  it("prevents a professional from moderating another tenant's review", async () => {
    const { useCase, review } = await setup();

    await expect(useCase.approve(review.id, "other-prof")).rejects.toThrow(ReviewNotFoundError);
  });
});
