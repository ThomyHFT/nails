import type { Review, ReviewStatus } from "@/server/domain/review/review.entity";

export interface NewReview {
  professionalId: string;
  bookingId: string;
  clientUserId: string;
  rating: number;
  body: string;
  photoUrl?: string | null;
  authorInstagram?: string | null;
}

export interface ReviewPatch {
  rating?: number;
  body?: string;
  photoUrl?: string | null;
  authorInstagram?: string | null;
  status?: ReviewStatus;
  moderatedAt?: Date;
}

export interface ReviewsRepository {
  listByProfessional(professionalId: string): Promise<Review[]>;
  listApproved(professionalId: string): Promise<Review[]>;
  countPending(professionalId: string): Promise<number>;
  findById(id: string, professionalId: string): Promise<Review | null>;
  findByBookingId(bookingId: string): Promise<Review | null>;
  create(review: NewReview): Promise<Review>;
  update(id: string, professionalId: string, patch: ReviewPatch): Promise<Review>;
}
