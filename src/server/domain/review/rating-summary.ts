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

export interface RatingBucket {
  rating: number;
  count: number;
}

/** Cantidad de reseñas por nota, de 5 a 1 estrellas. Es lo que le da peso al promedio: un 4,5 con 40 opiniones en cinco no se lee igual que uno con la mitad en tres. */
export function ratingDistribution(reviews: Review[]): RatingBucket[] {
  const counts = new Map<number, number>();
  for (const review of reviews) {
    counts.set(review.rating, (counts.get(review.rating) ?? 0) + 1);
  }
  return [5, 4, 3, 2, 1].map((rating) => ({ rating, count: counts.get(rating) ?? 0 }));
}
