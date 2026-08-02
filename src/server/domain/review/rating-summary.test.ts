import { describe, expect, it } from "vitest";
import { ratingDistribution, ratingSummary } from "@/server/domain/review/rating-summary";
import type { Review } from "@/server/domain/review/review.entity";

function review(overrides: Partial<Review> = {}): Review {
  return {
    id: "r1",
    professionalId: "p1",
    bookingId: "b1",
    clientUserId: "c1",
    rating: 5,
    body: "Excelente atención, muy recomendada.",
    photoUrl: null,
    status: "approved",
    createdAt: new Date(),
    moderatedAt: new Date(),
    authorInstagram: null,
    ...overrides,
  };
}

describe("ratingSummary", () => {
  it("returns null when there are no reviews", () => {
    expect(ratingSummary([])).toBeNull();
  });

  it("returns the rating itself as average with a single review", () => {
    const result = ratingSummary([review({ rating: 4 })]);
    expect(result).toEqual({ average: 4, count: 1 });
  });

  it("averages several reviews", () => {
    const reviews = [review({ rating: 5 }), review({ rating: 4 }), review({ rating: 3 })];
    const result = ratingSummary(reviews);
    expect(result).toEqual({ average: 4, count: 3 });
  });

  it("rounds the average to one decimal", () => {
    const reviews = [review({ rating: 5 }), review({ rating: 5 }), review({ rating: 4 })];
    const result = ratingSummary(reviews);
    expect(result).toEqual({ average: 4.7, count: 3 });
  });
});

describe("ratingDistribution", () => {
  it("returns all five buckets at zero when there are no reviews", () => {
    expect(ratingDistribution([])).toEqual([
      { rating: 5, count: 0 },
      { rating: 4, count: 0 },
      { rating: 3, count: 0 },
      { rating: 2, count: 0 },
      { rating: 1, count: 0 },
    ]);
  });

  it("counts reviews per rating, descending from 5 a 1", () => {
    const reviews = [
      review({ rating: 5 }),
      review({ rating: 5 }),
      review({ rating: 3 }),
      review({ rating: 1 }),
    ];
    expect(ratingDistribution(reviews)).toEqual([
      { rating: 5, count: 2 },
      { rating: 4, count: 0 },
      { rating: 3, count: 1 },
      { rating: 2, count: 0 },
      { rating: 1, count: 1 },
    ]);
  });
});
