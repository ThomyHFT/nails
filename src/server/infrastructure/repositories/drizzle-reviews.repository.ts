import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { reviews } from "@/server/infrastructure/db/schema/content";
import type { Review } from "@/server/domain/review/review.entity";
import type { NewReview, ReviewPatch, ReviewsRepository } from "@/server/domain/review/reviews-repository.port";

function toDomain(row: typeof reviews.$inferSelect): Review {
  return {
    id: row.id,
    professionalId: row.professionalId,
    bookingId: row.bookingId,
    clientUserId: row.clientUserId,
    rating: row.rating,
    body: row.body,
    photoUrl: row.photoUrl,
    status: row.status,
    createdAt: row.createdAt,
    moderatedAt: row.moderatedAt,
    authorInstagram: row.authorInstagram,
  };
}

export class DrizzleReviewsRepository implements ReviewsRepository {
  async listByProfessional(professionalId: string): Promise<Review[]> {
    const rows = await db
      .select()
      .from(reviews)
      .where(eq(reviews.professionalId, professionalId))
      .orderBy(desc(reviews.createdAt));
    return rows.map(toDomain);
  }

  async listApproved(professionalId: string): Promise<Review[]> {
    const rows = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.professionalId, professionalId), eq(reviews.status, "approved")))
      .orderBy(desc(reviews.createdAt));
    return rows.map(toDomain);
  }

  async countPending(professionalId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviews)
      .where(and(eq(reviews.professionalId, professionalId), eq(reviews.status, "pending")));
    return row?.count ?? 0;
  }

  async findById(id: string, professionalId: string): Promise<Review | null> {
    const [row] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, id), eq(reviews.professionalId, professionalId)))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findByBookingId(bookingId: string): Promise<Review | null> {
    const [row] = await db.select().from(reviews).where(eq(reviews.bookingId, bookingId)).limit(1);
    return row ? toDomain(row) : null;
  }

  async create(review: NewReview): Promise<Review> {
    const [row] = await db
      .insert(reviews)
      .values({
        professionalId: review.professionalId,
        bookingId: review.bookingId,
        clientUserId: review.clientUserId,
        rating: review.rating,
        body: review.body,
        photoUrl: review.photoUrl ?? null,
        status: "pending",
        authorInstagram: review.authorInstagram ?? null,
      })
      .returning();
    return toDomain(row);
  }

  async update(id: string, professionalId: string, patch: ReviewPatch): Promise<Review> {
    const [row] = await db
      .update(reviews)
      .set(patch)
      .where(and(eq(reviews.id, id), eq(reviews.professionalId, professionalId)))
      .returning();
    return toDomain(row);
  }
}
