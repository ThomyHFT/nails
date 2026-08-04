import { eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { db } from "@/server/infrastructure/db/client";
import { serviceVariants, services } from "@/server/infrastructure/db/schema/services";
import type { Review } from "@/server/domain/review/review.entity";
import { ListReviewsUseCase } from "@/server/application/review/list-reviews.use-case";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleReviewsRepository } from "@/server/infrastructure/repositories/drizzle-reviews.repository";
import { ReviewModerationActions } from "@/app/[slug]/admin/opiniones/ReviewModerationActions";
import { AdminPageHeader, Chip, EmptyState, Overline, ReviewCard, ReviewStatusChip } from "@/components/brand";


function formatDateTime(date: Date) {
  return date.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" });
}

export default async function OpinionesAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  if (!professional) {
    notFound();
  }

  const reviews = await new ListReviewsUseCase(new DrizzleReviewsRepository()).listForProfessional(professional.id);

  const bookingRepository = new DrizzleBookingRepository();
  const bookings = await Promise.all(reviews.map((review) => bookingRepository.findById(review.bookingId)));
  const bookingById = new Map(
    bookings
      .filter((booking): booking is NonNullable<typeof booking> => booking !== null)
      .map((booking) => [booking.id, booking]),
  );

  const variantIds = Array.from(new Set(Array.from(bookingById.values()).map((booking) => booking.serviceVariantId)));
  const variantRows = variantIds.length
    ? await db
        .select({ id: serviceVariants.id, label: serviceVariants.label, serviceName: services.name })
        .from(serviceVariants)
        .innerJoin(services, eq(serviceVariants.serviceId, services.id))
        .where(inArray(serviceVariants.id, variantIds))
    : [];
  const variantById = new Map(variantRows.map((variant) => [variant.id, variant]));

  const pending = reviews.filter((review) => review.status === "pending");
  const moderated = reviews.filter((review) => review.status !== "pending");

  function renderReview(review: Review) {
    const booking = bookingById.get(review.bookingId);
    const variant = booking ? variantById.get(booking.serviceVariantId) : undefined;
    const serviceLabel = variant
      ? `${variant.serviceName} · ${variant.label ?? "—"}`
      : null;

    return (
      <ReviewCard
        key={review.id}
        rating={review.rating}
        body={review.body}
        photoUrl={review.photoUrl}
        authorInstagram={review.authorInstagram}
        date={booking ? formatDateTime(booking.startsAt) : undefined}
        // En moderación el autor no es lo que se decide: lo que importa es de
        // qué servicio habla la opinión y en qué estado está.
        authorName={serviceLabel ?? "Sin servicio"}
        action={
          <div className="flex items-center gap-2">
            {review.status !== "pending" && <ReviewStatusChip status={review.status} />}
            <ReviewModerationActions reviewId={review.id} status={review.status} />
          </div>
        }
      />
    );
  }

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <AdminPageHeader
        title="Opiniones"
        description="Nada se publica sin tu aprobación. Puedes revertir una decisión cuando quieras."
        action={pending.length > 0 ? <Chip tone="warning">{pending.length} por revisar</Chip> : undefined}
      />

      <section className="flex flex-col gap-4">
        <Overline>Pendientes</Overline>
        {pending.length === 0 ? (
          <EmptyState
            icon={<Star className="size-5" />}
            title="No hay opiniones pendientes"
            description="Cuando una clienta opine sobre una reserva completada, aparecerá acá."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">{pending.map(renderReview)}</div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <Overline>Moderadas</Overline>
        {moderated.length === 0 ? (
          <EmptyState title="Todavía no moderaste ninguna opinión" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">{moderated.map(renderReview)}</div>
        )}
      </section>
    </div>
  );
}
