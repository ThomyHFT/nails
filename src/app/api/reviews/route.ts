import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
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
import { SubmitReviewUseCase } from "@/server/application/review/submit-review.use-case";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleReviewsRepository } from "@/server/infrastructure/repositories/drizzle-reviews.repository";
import { VercelBlobStorage } from "@/server/infrastructure/storage/vercel-blob-storage";

function buildUseCase() {
  return new SubmitReviewUseCase(
    new DrizzleReviewsRepository(),
    new DrizzleBookingRepository(),
    new VercelBlobStorage(),
  );
}

function errorResponse(err: unknown) {
  if (err instanceof ReviewBookingNotFoundError || err instanceof ReviewNotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
  if (err instanceof BookingNotOwnedByClientError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (
    err instanceof BookingNotCompletedError ||
    err instanceof ReviewAlreadyExistsError ||
    err instanceof InvalidRatingError ||
    err instanceof InvalidReviewBodyError ||
    err instanceof InvalidInstagramHandleError ||
    err instanceof ReviewNotEditableError
  ) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  throw err;
}

const postSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int(),
  body: z.string(),
  photoUrl: z.string().nullable().optional(),
  authorInstagram: z.string().nullable().optional(),
});

const patchSchema = postSchema;

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "client") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  try {
    const review = await buildUseCase().submit({ ...parsed.data, clientUserId: session.user.id });
    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "client") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const { bookingId, ...patch } = parsed.data;
  try {
    const review = await buildUseCase().edit(bookingId, session.user.id, patch);
    return NextResponse.json({ review });
  } catch (err) {
    return errorResponse(err);
  }
}
