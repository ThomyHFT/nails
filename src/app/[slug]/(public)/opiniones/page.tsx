import { inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { db } from "@/server/infrastructure/db/client";
import { users } from "@/server/infrastructure/db/schema/users";
import { ratingDistribution, ratingSummary } from "@/server/domain/review/rating-summary";
import { reviewerDisplayName } from "@/server/domain/review/reviewer-display-name";
import { GetProfessionalBySlugUseCase } from "@/server/application/tenant/get-professional-by-slug.use-case";
import { ListReviewsUseCase } from "@/server/application/review/list-reviews.use-case";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleReviewsRepository } from "@/server/infrastructure/repositories/drizzle-reviews.repository";
import {
  Caption,
  Container,
  Display,
  EmptyState,
  Panel,
  RatingDistribution,
  RatingSummary,
  ReviewCard,
  Section,
} from "@/components/brand";

function formatDate(date: Date) {
  return date.toLocaleDateString("es-CL", { dateStyle: "medium" });
}

export default async function OpinionesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const professional = await new GetProfessionalBySlugUseCase(new DrizzleProfessionalRepository()).execute(slug);
  if (!professional) {
    notFound();
  }

  const reviews = await new ListReviewsUseCase(new DrizzleReviewsRepository()).listPublic(professional.id);
  const summary = ratingSummary(reviews);
  const distribution = ratingDistribution(reviews);

  const clientIds = Array.from(new Set(reviews.map((review) => review.clientUserId)));
  const clientRows = clientIds.length
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, clientIds))
    : [];
  const nameByClientId = new Map(clientRows.map((client) => [client.id, client.name]));

  return (
    <Container size="md">
      <Section className="flex flex-col gap-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3">
            <Display as="h1">Opiniones</Display>
            {summary ? (
              <RatingSummary average={summary.average} count={summary.count} size="lg" />
            ) : (
              <Caption>Las opiniones las escriben clientas con una reserva completada.</Caption>
            )}
          </div>

          {/* La distribución le da peso al promedio: un 4,5 con casi todo en
              5 estrellas no se lee igual que uno con la mitad en 3. */}
          {summary && (
            <Panel padding="sm" className="w-full sm:max-w-xs">
              <RatingDistribution buckets={distribution} total={summary.count} />
            </Panel>
          )}
        </div>

        {reviews.length === 0 ? (
          <EmptyState
            icon={<Star className="size-5" />}
            title="Todavía no hay opiniones publicadas"
            description="Cuando una clienta opine y la profesional apruebe la opinión, aparecerá acá."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {reviews.map((review) => {
              const clientName = nameByClientId.get(review.clientUserId);
              return (
                <ReviewCard
                  key={review.id}
                  rating={review.rating}
                  body={review.body}
                  photoUrl={review.photoUrl}
                  date={formatDate(review.createdAt)}
                  authorName={clientName ? reviewerDisplayName(clientName) : null}
                  authorInstagram={review.authorInstagram}
                />
              );
            })}
          </div>
        )}
      </Section>
    </Container>
  );
}
