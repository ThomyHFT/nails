import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { CalendarCheck, CalendarDays } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/server/infrastructure/db/client";
import type { BookingStatus } from "@/server/domain/booking/booking.entity";
import type { Review } from "@/server/domain/review/review.entity";
import { serviceVariants, services } from "@/server/infrastructure/db/schema/services";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleReviewsRepository } from "@/server/infrastructure/repositories/drizzle-reviews.repository";
import {
  BrandButton,
  Caption,
  Container,
  Display,
  EmptyState,
  MetaItem,
  Panel,
  Price,
  ReviewStatusChip,
  Section,
  StatusBadge,
  Title,
} from "@/components/brand";
import { CancelBookingButton } from "@/app/[slug]/(public)/cuenta/CancelBookingButton";
import { SignOutButton } from "@/app/[slug]/(public)/cuenta/SignOutButton";

const CANCELLABLE_STATUSES = new Set<BookingStatus>(["pending", "confirmed"]);

const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  pending: { label: "Pendiente", tone: "warning" },
  confirmed: { label: "Confirmada", tone: "success" },
  completed: { label: "Completada", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "danger" },
  no_show: { label: "No asististe", tone: "danger" },
};

const NAIL_LENGTH_LABELS: Record<string, string> = {
  short: "Corta",
  medium: "Media",
  long: "Larga",
  single: "Única",
};

function formatDateTime(date: Date) {
  return date.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Acción de opinión de una reserva completada. Tres estados: todavía no opinó
 * (botón), opinó y sigue en revisión (chip + editar), o ya fue moderada (solo
 * chip, porque una vez moderada la opinión queda congelada).
 */
function ReviewAction({ slug, bookingId, review }: { slug: string; bookingId: string; review: Review | null }) {
  if (!review) {
    return (
      <BrandButton size="sm" variant="outline" href={`/${slug}/cuenta/opinar/${bookingId}`}>
        Opinar
      </BrandButton>
    );
  }

  if (review.status === "pending") {
    return (
      <div className="flex items-center gap-2">
        <ReviewStatusChip status="pending" />
        <BrandButton size="sm" variant="ghost" href={`/${slug}/cuenta/opinar/${bookingId}`}>
          Editar
        </BrandButton>
      </div>
    );
  }

  return <ReviewStatusChip status={review.status} />;
}

export default async function CuentaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();

  if (!session) {
    redirect(`/${slug}/login`);
  }

  const bookingRepository = new DrizzleBookingRepository();
  const bookings = await bookingRepository.listByClient(session.user.id);

  const variantIds = Array.from(new Set(bookings.map((b) => b.serviceVariantId)));
  const variantRows = variantIds.length
    ? await db
        .select({ id: serviceVariants.id, nailLength: serviceVariants.nailLength, serviceName: services.name })
        .from(serviceVariants)
        .innerJoin(services, eq(serviceVariants.serviceId, services.id))
        .where(inArray(serviceVariants.id, variantIds))
    : [];
  const variantById = new Map(variantRows.map((v) => [v.id, v]));

  const completedBookings = bookings.filter((b) => b.status === "completed");
  const reviewsRepository = new DrizzleReviewsRepository();
  const reviewEntries = await Promise.all(
    completedBookings.map(async (b) => [b.id, await reviewsRepository.findByBookingId(b.id)] as const),
  );
  const reviewByBookingId = new Map(reviewEntries);

  return (
    <Container size="md">
      <Section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Display as="h1">Mis reservas</Display>
          <Caption>
            Sesión iniciada como <strong className="font-medium text-foreground">{session.user.email}</strong>
          </Caption>
        </div>

        {bookings.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck className="size-5" />}
            title="Todavía no tienes reservas"
            description="Elige un servicio y una hora disponible para agendar tu primera cita."
            action={<BrandButton href={`/${slug}/reservar`}>Reservar hora</BrandButton>}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {bookings.map((booking) => {
              const variant = variantById.get(booking.serviceVariantId);
              const status = BOOKING_STATUS[booking.status];
              const showActions = CANCELLABLE_STATUSES.has(booking.status) || booking.status === "completed";
              return (
                <Panel key={booking.id} padding="sm" className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <Title>{variant ? variant.serviceName : "Servicio"}</Title>
                      {variant && (
                        <Caption>Largo {NAIL_LENGTH_LABELS[variant.nailLength] ?? variant.nailLength}</Caption>
                      )}
                    </div>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <MetaItem icon={<CalendarDays />}>{formatDateTime(booking.startsAt)}</MetaItem>
                    <Price clp={booking.priceClp} size="sm" />
                  </div>

                  {showActions && (
                    <div className="flex items-center justify-end gap-3 border-t border-outline-variant pt-3">
                      {CANCELLABLE_STATUSES.has(booking.status) && <CancelBookingButton bookingId={booking.id} />}
                      {booking.status === "completed" && (
                        <ReviewAction
                          slug={slug}
                          bookingId={booking.id}
                          review={reviewByBookingId.get(booking.id) ?? null}
                        />
                      )}
                    </div>
                  )}
                </Panel>
              );
            })}
          </div>
        )}

        {/* Discreta y al final: es una acción de servicio, no debería
            competir en tono con el título de la página. */}
        <SignOutButton slug={slug} />
      </Section>
    </Container>
  );
}
