import { cache } from "react";
import { loadTenantForPwa } from "@/app/[slug]/_pwa/manifest-response";
import { reviewerDisplayName } from "@/server/domain/review/reviewer-display-name";
import { DrizzleReviewsRepository } from "@/server/infrastructure/repositories/drizzle-reviews.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Una opinión aprobada de un negocio público (SPEC 21), o `null`. Pendientes
 * y rechazadas no existen hacia afuera. `cache` la comparte entre la página,
 * su metadata y la imagen para compartir dentro de una misma petición.
 */
export const loadPublicReview = cache(async (slug: string, reviewId: string) => {
  if (!UUID.test(reviewId)) return null;
  const tenant = await loadTenantForPwa(slug);
  if (!tenant) return null;

  const review = await new DrizzleReviewsRepository().findById(reviewId, tenant.professional.id);
  if (!review || review.status !== "approved") return null;

  const author = await new DrizzleUserRepository().findById(review.clientUserId);
  return {
    ...tenant,
    review,
    authorName: author ? reviewerDisplayName(author.name) : null,
  };
});
