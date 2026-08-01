import type { Review } from "@/server/domain/review/review.entity";

export interface RatingSummary {
  average: number;
  count: number;
}

export function ratingSummary(reviews: Review[]): RatingSummary | null {
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  const average = Math.round((total / reviews.length) * 10) / 10;
  return { average, count: reviews.length };
}
