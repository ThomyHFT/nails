import type { Review } from "@/server/domain/review/review.entity";
import type { NewReview, ReviewPatch, ReviewsRepository } from "@/server/domain/review/reviews-repository.port";

export class InMemoryReviewsRepository implements ReviewsRepository {
  readonly reviews: Review[] = [];
  private nextId = 1;

  async listByProfessional(professionalId: string): Promise<Review[]> {
    return this.reviews.filter((r) => r.professionalId === professionalId);
  }

  async listApproved(professionalId: string): Promise<Review[]> {
    return this.reviews
      .filter((r) => r.professionalId === professionalId && r.status === "approved")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async countPending(professionalId: string): Promise<number> {
    return this.reviews.filter((r) => r.professionalId === professionalId && r.status === "pending").length;
  }

  async findById(id: string, professionalId: string): Promise<Review | null> {
    return this.reviews.find((r) => r.id === id && r.professionalId === professionalId) ?? null;
  }

  async findByBookingId(bookingId: string): Promise<Review | null> {
    return this.reviews.find((r) => r.bookingId === bookingId) ?? null;
  }

  async create(review: NewReview): Promise<Review> {
    const created: Review = {
      id: `review-${this.nextId++}`,
      professionalId: review.professionalId,
      bookingId: review.bookingId,
      clientUserId: review.clientUserId,
      rating: review.rating,
      body: review.body,
      photoUrl: review.photoUrl ?? null,
      status: "pending",
      createdAt: new Date(),
      moderatedAt: null,
      authorInstagram: review.authorInstagram ?? null,
    };
    this.reviews.push(created);
    return created;
  }

  async update(id: string, professionalId: string, patch: ReviewPatch): Promise<Review> {
    const review = this.reviews.find((r) => r.id === id && r.professionalId === professionalId);
    if (!review) throw new Error("Review no encontrada");
    Object.assign(review, patch);
    return review;
  }
}
