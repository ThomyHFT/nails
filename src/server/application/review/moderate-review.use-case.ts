import type { Review, ReviewStatus } from "@/server/domain/review/review.entity";
import type { ReviewsRepository } from "@/server/domain/review/reviews-repository.port";
import { ReviewNotFoundError } from "@/server/application/review/review-errors";

export class ModerateReviewUseCase {
  constructor(private readonly reviewsRepository: ReviewsRepository) {}

  async approve(id: string, professionalId: string): Promise<Review> {
    return this.transition(id, professionalId, "approved");
  }

  async reject(id: string, professionalId: string): Promise<Review> {
    return this.transition(id, professionalId, "rejected");
  }

  private async transition(id: string, professionalId: string, status: ReviewStatus): Promise<Review> {
    const existing = await this.reviewsRepository.findById(id, professionalId);
    if (!existing) throw new ReviewNotFoundError();

    return this.reviewsRepository.update(id, professionalId, { status, moderatedAt: new Date() });
  }
}
