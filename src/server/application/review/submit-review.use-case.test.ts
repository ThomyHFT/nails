import { describe, expect, it } from "vitest";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { InMemoryBlobStorage } from "@/server/application/portfolio/__fakes__/in-memory-blob-storage";
import { InMemoryReviewsRepository } from "@/server/application/review/__fakes__/in-memory-reviews-repository";
import {
  BookingNotCompletedError,
  BookingNotOwnedByClientError,
  InvalidInstagramHandleError,
  InvalidRatingError,
  InvalidReviewBodyError,
  ReviewAlreadyExistsError,
  ReviewBookingNotFoundError,
  ReviewNotEditableError,
} from "@/server/application/review/review-errors";
import { SubmitReviewUseCase } from "@/server/application/review/submit-review.use-case";

const PROFESSIONAL_ID = "prof-1";
const CLIENT_ID = "client-1";

async function setup() {
  const reviewsRepository = new InMemoryReviewsRepository();
  const bookingRepository = new InMemoryBookingRepository();
  const blobStorage = new InMemoryBlobStorage();
  const useCase = new SubmitReviewUseCase(reviewsRepository, bookingRepository, blobStorage);

  const booking = await bookingRepository.create({
    professionalId: PROFESSIONAL_ID,
    clientUserId: CLIENT_ID,
    serviceVariantId: "variant-1",
    startsAt: new Date("2026-01-01T10:00:00Z"),
    endsAt: new Date("2026-01-01T11:00:00Z"),
    priceClp: 10_000,
    durationMinutes: 60,
  });
  await bookingRepository.updateStatus(booking.id, "completed");

  return { reviewsRepository, bookingRepository, blobStorage, useCase, booking };
}

const VALID_BODY = "Quedé súper contenta con el resultado final.";

describe("SubmitReviewUseCase.submit", () => {
  it("rejects a booking that does not exist", async () => {
    const { useCase } = await setup();

    await expect(
      useCase.submit({ bookingId: "missing", clientUserId: CLIENT_ID, rating: 5, body: VALID_BODY }),
    ).rejects.toThrow(ReviewBookingNotFoundError);
  });

  it("rejects a booking owned by another client", async () => {
    const { useCase, booking } = await setup();

    await expect(
      useCase.submit({ bookingId: booking.id, clientUserId: "other-client", rating: 5, body: VALID_BODY }),
    ).rejects.toThrow(BookingNotOwnedByClientError);
  });

  it("rejects a booking that is not completed", async () => {
    const { useCase, bookingRepository, booking } = await setup();
    await bookingRepository.updateStatus(booking.id, "confirmed");

    await expect(
      useCase.submit({ bookingId: booking.id, clientUserId: CLIENT_ID, rating: 5, body: VALID_BODY }),
    ).rejects.toThrow(BookingNotCompletedError);
  });

  it("rejects a second review for the same booking", async () => {
    const { useCase, booking } = await setup();
    await useCase.submit({ bookingId: booking.id, clientUserId: CLIENT_ID, rating: 5, body: VALID_BODY });

    await expect(
      useCase.submit({ bookingId: booking.id, clientUserId: CLIENT_ID, rating: 4, body: VALID_BODY }),
    ).rejects.toThrow(ReviewAlreadyExistsError);
  });

  it("rejects a body shorter than 10 characters", async () => {
    const { useCase, booking } = await setup();

    await expect(
      useCase.submit({ bookingId: booking.id, clientUserId: CLIENT_ID, rating: 5, body: "corto" }),
    ).rejects.toThrow(InvalidReviewBodyError);
  });

  it("rejects a body longer than 1000 characters", async () => {
    const { useCase, booking } = await setup();

    await expect(
      useCase.submit({ bookingId: booking.id, clientUserId: CLIENT_ID, rating: 5, body: "a".repeat(1001) }),
    ).rejects.toThrow(InvalidReviewBodyError);
  });

  it("rejects a rating of 0", async () => {
    const { useCase, booking } = await setup();

    await expect(
      useCase.submit({ bookingId: booking.id, clientUserId: CLIENT_ID, rating: 0, body: VALID_BODY }),
    ).rejects.toThrow(InvalidRatingError);
  });

  it("rejects a rating of 6", async () => {
    const { useCase, booking } = await setup();

    await expect(
      useCase.submit({ bookingId: booking.id, clientUserId: CLIENT_ID, rating: 6, body: VALID_BODY }),
    ).rejects.toThrow(InvalidRatingError);
  });

  it("rejects an invalid instagram handle", async () => {
    const { useCase, booking } = await setup();

    await expect(
      useCase.submit({
        bookingId: booking.id,
        clientUserId: CLIENT_ID,
        rating: 5,
        body: VALID_BODY,
        authorInstagram: "a".repeat(31),
      }),
    ).rejects.toThrow(InvalidInstagramHandleError);
  });

  it("derives professionalId from the booking, ignoring any injected value", async () => {
    const { useCase, booking, reviewsRepository } = await setup();

    const review = await useCase.submit({
      bookingId: booking.id,
      clientUserId: CLIENT_ID,
      rating: 5,
      body: VALID_BODY,
    });

    expect(review.professionalId).toBe(PROFESSIONAL_ID);
    expect(reviewsRepository.reviews[0].professionalId).toBe(PROFESSIONAL_ID);
  });

  it("normalizes the instagram handle before storing it", async () => {
    const { useCase, booking } = await setup();

    const review = await useCase.submit({
      bookingId: booking.id,
      clientUserId: CLIENT_ID,
      rating: 5,
      body: VALID_BODY,
      authorInstagram: "@Camila",
    });

    expect(review.authorInstagram).toBe("camila");
  });

  it("creates the review in pending status", async () => {
    const { useCase, booking } = await setup();

    const review = await useCase.submit({ bookingId: booking.id, clientUserId: CLIENT_ID, rating: 5, body: VALID_BODY });

    expect(review.status).toBe("pending");
  });
});

describe("SubmitReviewUseCase.edit", () => {
  it("updates a pending review", async () => {
    const { useCase, booking } = await setup();
    await useCase.submit({ bookingId: booking.id, clientUserId: CLIENT_ID, rating: 3, body: VALID_BODY });

    const updated = await useCase.edit(booking.id, CLIENT_ID, { rating: 5, body: "Cambié de opinión, quedó genial." });

    expect(updated.rating).toBe(5);
    expect(updated.body).toBe("Cambié de opinión, quedó genial.");
  });

  it("rejects editing a review already approved", async () => {
    const { useCase, booking, reviewsRepository } = await setup();
    const review = await useCase.submit({ bookingId: booking.id, clientUserId: CLIENT_ID, rating: 3, body: VALID_BODY });
    await reviewsRepository.update(review.id, PROFESSIONAL_ID, { status: "approved", moderatedAt: new Date() });

    await expect(
      useCase.edit(booking.id, CLIENT_ID, { rating: 5, body: VALID_BODY }),
    ).rejects.toThrow(ReviewNotEditableError);
  });

  it("rejects editing a review already rejected", async () => {
    const { useCase, booking, reviewsRepository } = await setup();
    const review = await useCase.submit({ bookingId: booking.id, clientUserId: CLIENT_ID, rating: 3, body: VALID_BODY });
    await reviewsRepository.update(review.id, PROFESSIONAL_ID, { status: "rejected", moderatedAt: new Date() });

    await expect(
      useCase.edit(booking.id, CLIENT_ID, { rating: 5, body: VALID_BODY }),
    ).rejects.toThrow(ReviewNotEditableError);
  });

  it("deletes the previous photo blob when replaced", async () => {
    const { useCase, booking, blobStorage } = await setup();
    await useCase.submit({
      bookingId: booking.id,
      clientUserId: CLIENT_ID,
      rating: 3,
      body: VALID_BODY,
      photoUrl: "https://blob.example.com/old.jpg",
    });

    await useCase.edit(booking.id, CLIENT_ID, {
      rating: 3,
      body: VALID_BODY,
      photoUrl: "https://blob.example.com/new.jpg",
    });

    expect(blobStorage.deletedUrls).toEqual(["https://blob.example.com/old.jpg"]);
  });
});
