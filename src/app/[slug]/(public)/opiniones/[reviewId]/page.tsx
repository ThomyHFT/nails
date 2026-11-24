import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionLink, BrandButton, Container, ReviewCard, Section } from "@/components/brand";
import { siteUrl } from "@/app/_lib/site-url";
import { loadPublicReview } from "@/app/[slug]/(public)/opiniones/[reviewId]/load-review";
import { ShareButtons } from "@/app/[slug]/(public)/opiniones/[reviewId]/ShareButtons";

type Params = { params: Promise<{ slug: string; reviewId: string }> };

function excerpt(body: string, max = 150): string {
  return body.length > max ? `${body.slice(0, max - 1).trimEnd()}…` : body;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, reviewId } = await params;
  const data = await loadPublicReview(slug, reviewId);
  if (!data) return {};
  const business = data.professional.businessName;
  const title = `${"★".repeat(data.review.rating)} ${data.authorName ?? "Una clienta"} sobre ${business}`;
  return {
    title,
    description: excerpt(data.review.body),
    openGraph: { title, description: excerpt(data.review.body), type: "article" },
  };
}

/** Una opinión sola, para compartirla en WhatsApp o Instagram (SPEC 21). */
export default async function ReviewSharePage({ params }: Params) {
  const { slug, reviewId } = await params;
  const data = await loadPublicReview(slug, reviewId);
  if (!data) notFound();

  const url = `${siteUrl()}/${slug}/opiniones/${reviewId}`;
  const business = data.professional.businessName;

  return (
    <Container size="md">
      <Section className="flex flex-col gap-6">
        <ReviewCard
          rating={data.review.rating}
          body={data.review.body}
          photoUrl={data.review.photoUrl}
          authorName={data.authorName}
          authorInstagram={data.review.authorInstagram}
          date={data.review.createdAt.toLocaleDateString("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" })}
        />
        <ShareButtons url={url} text={`Mira lo que dicen de ${business}:`} />
        <div className="flex flex-wrap items-center gap-4">
          <BrandButton href={`/${slug}/reservar`}>Reservar en {business}</BrandButton>
          <ActionLink href={`/${slug}/opiniones`}>Ver todas las opiniones</ActionLink>
        </div>
      </Section>
    </Container>
  );
}
