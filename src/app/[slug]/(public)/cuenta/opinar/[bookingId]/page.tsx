import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleReviewsRepository } from "@/server/infrastructure/repositories/drizzle-reviews.repository";
import { ReviewForm } from "@/app/[slug]/(public)/cuenta/opinar/[bookingId]/ReviewForm";
import { Caption, Container, Display, Section } from "@/components/brand";

export default async function OpinarPage({
  params,
}: {
  params: Promise<{ slug: string; bookingId: string }>;
}) {
  const { slug, bookingId } = await params;
  const session = await auth();
  if (!session) redirect(`/${slug}/login`);
  if (session.user.role !== "client") notFound();

  const booking = await new DrizzleBookingRepository().findById(bookingId);
  if (!booking || booking.clientUserId !== session.user.id || booking.status !== "completed") {
    notFound();
  }

  const existing = await new DrizzleReviewsRepository().findByBookingId(bookingId);
  if (existing && existing.status !== "pending") {
    notFound();
  }

  return (
    <Container size="md">
      <Section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Display as="h1">{existing ? "Editar tu opinión" : "Deja tu opinión"}</Display>
          <Caption>
            {existing
              ? "Puedes cambiarla mientras siga en revisión. Una vez moderada, queda como está."
              : "La profesional la revisa antes de publicarla en su micrositio."}
          </Caption>
        </div>
        <ReviewForm
        slug={slug}
        bookingId={bookingId}
        initialReview={
          existing
            ? {
                rating: existing.rating,
                body: existing.body,
                photoUrl: existing.photoUrl,
                authorInstagram: existing.authorInstagram,
              }
            : null
        }
        />
      </Section>
    </Container>
  );
}
