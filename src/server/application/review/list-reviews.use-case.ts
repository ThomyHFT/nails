import type { Review } from "@/server/domain/review/review.entity";
import type { ReviewsRepository } from "@/server/domain/review/reviews-repository.port";

export class ListReviewsUseCase {
  constructor(private readonly reviewsRepository: ReviewsRepository) {}

  async listForProfessional(professionalId: string): Promise<Review[]> {
    const reviews = await this.reviewsRepository.listByProfessional(professionalId);
    return [...reviews].sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  async listPublic(professionalId: string): Promise<Review[]> {
    return this.reviewsRepository.listApproved(professionalId);
  }

  async countPending(professionalId: string): Promise<number> {
    return this.reviewsRepository.countPending(professionalId);
  }
}
