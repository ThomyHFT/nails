import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { BlobStorage } from "@/server/domain/portfolio/blob-storage.port";
import { isValidInstagramHandle, normalizeInstagramHandle } from "@/server/domain/review/instagram-handle";
import type { Review } from "@/server/domain/review/review.entity";
import type { ReviewsRepository } from "@/server/domain/review/reviews-repository.port";
import {
  BookingNotCompletedError,
  BookingNotOwnedByClientError,
  InvalidInstagramHandleError,
  InvalidRatingError,
  InvalidReviewBodyError,
  ReviewAlreadyExistsError,
  ReviewBookingNotFoundError,
  ReviewNotEditableError,
  ReviewNotFoundError,
} from "@/server/application/review/review-errors";

export interface SubmitReviewInput {
  bookingId: string;
  clientUserId: string;
  rating: number;
  body: string;
  photoUrl?: string | null;
  authorInstagram?: string | null;
}

export interface EditReviewInput {
  rating: number;
  body: string;
  photoUrl?: string | null;
  authorInstagram?: string | null;
}

function validateContent(input: {
  rating: number;
  body: string;
  authorInstagram?: string | null;
}): string | null {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new InvalidRatingError();
  }
  if (input.body.length < 10 || input.body.length > 1000) {
    throw new InvalidReviewBodyError();
  }
  if (!input.authorInstagram) return null;
  const normalized = normalizeInstagramHandle(input.authorInstagram);
  if (!isValidInstagramHandle(normalized)) {
    throw new InvalidInstagramHandleError();
  }
  return normalized;
}

export class SubmitReviewUseCase {
  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly bookingRepository: BookingRepository,
    private readonly blobStorage: BlobStorage,
  ) {}

  async submit(input: SubmitReviewInput): Promise<Review> {
    const booking = await this.bookingRepository.findById(input.bookingId);
    if (!booking) throw new ReviewBookingNotFoundError();
    if (booking.clientUserId !== input.clientUserId) throw new BookingNotOwnedByClientError();
    if (booking.status !== "completed") throw new BookingNotCompletedError();

    const existing = await this.reviewsRepository.findByBookingId(input.bookingId);
    if (existing) throw new ReviewAlreadyExistsError();

    const authorInstagram = validateContent(input);

    return this.reviewsRepository.create({
      professionalId: booking.professionalId,
      bookingId: booking.id,
      clientUserId: input.clientUserId,
      rating: input.rating,
      body: input.body,
      photoUrl: input.photoUrl ?? null,
      authorInstagram,
    });
  }

  async edit(bookingId: string, clientUserId: string, input: EditReviewInput): Promise<Review> {
    const existing = await this.reviewsRepository.findByBookingId(bookingId);
    if (!existing) throw new ReviewNotFoundError();
    if (existing.clientUserId !== clientUserId) throw new BookingNotOwnedByClientError();
    if (existing.status !== "pending") throw new ReviewNotEditableError();

    const authorInstagram = validateContent(input);
    const photoUrl = input.photoUrl ?? existing.photoUrl;

    if (existing.photoUrl && photoUrl !== existing.photoUrl) {
      await this.blobStorage.delete(existing.photoUrl);
    }

    return this.reviewsRepository.update(existing.id, existing.professionalId, {
      rating: input.rating,
      body: input.body,
      photoUrl,
      authorInstagram,
    });
  }
}
