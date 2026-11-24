import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { CalendarCheck, CalendarDays } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/server/infrastructure/db/client";
import type { BookingStatus } from "@/server/domain/booking/booking.entity";
import type { Review } from "@/server/domain/review/review.entity";
import { serviceVariants, services } from "@/server/infrastructure/db/schema/services";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleReviewsRepository } from "@/server/infrastructure/repositories/drizzle-reviews.repository";
import { verticalCopy } from "@/server/domain/tenant/vertical";
import { isWithinClientChangeWindow } from "@/server/domain/professional/booking-policy";
import { isPhoneVisible } from "@/server/domain/professional/professional.entity";
import { whatsAppLink } from "@/server/domain/user/client-contact";
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
import { DepositInstructions } from "@/app/[slug]/(public)/_deposit/DepositInstructions";
import { depositInfoFor } from "@/app/[slug]/(public)/_deposit/deposit-info";
import { LeaveWaitlistButton } from "@/app/[slug]/(public)/cuenta/LeaveWaitlistButton";
import { DrizzleWaitlistRepository } from "@/server/infrastructure/repositories/drizzle-waitlist.repository";
import { localDateIn } from "@/server/domain/waitlist/waitlist";

const CANCELLABLE_STATUSES = new Set<BookingStatus>(["pending", "confirmed"]);

const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  pending: { label: "Pendiente", tone: "warning" },
  confirmed: { label: "Confirmada", tone: "success" },
  completed: { label: "Completada", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "danger" },
  no_show: { label: "No asististe", tone: "danger" },
};

function formatDateTime(date: Date) {
  return date.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" });
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
  // SPEC 22: una integrante no tiene reservas como clienta; su casa es el panel de equipo.
  if (session.user.role === "staff") {
    redirect(`/${slug}/equipo`);
  }

  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  const variantAxisLabel = verticalCopy(professional?.vertical ?? "nails").variantAxisLabel;

  const bookingRepository = new DrizzleBookingRepository();
  // Solo las reservas de este negocio: la clienta puede tener cuenta en varios
  // tenants, y cada uno aplica su propio plazo de cancelación.
  const bookings = (await bookingRepository.listByClient(session.user.id)).filter(
    (b) => !professional || b.professionalId === professional.id,
  );
  const policy = professional?.bookingPolicy;
  const deadlineHours = policy?.cancellationDeadlineHours ?? 0;
  const professionalWhatsApp =
    professional && isPhoneVisible(professional) && professional.phone ? whatsAppLink(professional.phone) : null;
  const now = new Date();
  const depositInfo = professional ? depositInfoFor(professional) : null;
  // SPEC 21: los días en que espera que se libere una hora.
  const waitlist = professional
    ? await new DrizzleWaitlistRepository().listByClient(
        professional.id,
        session.user.id,
        localDateIn(now, professional.timezone),
      )
    : [];

  const variantIds = Array.from(new Set(bookings.map((b) => b.serviceVariantId)));
  const variantRows = variantIds.length
    ? await db
        .select({
          id: serviceVariants.id,
          label: serviceVariants.label,
          serviceName: services.name,
          serviceId: services.id,
          active: serviceVariants.active,
          serviceActive: services.active,
        })
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
            {" · "}
            <a href={`/${slug}/cuenta/perfil`} className="font-medium text-foreground underline underline-offset-4">
              Mi perfil
            </a>
          </Caption>
          {deadlineHours > 0 && (
            <Caption>Puedes cancelar o reagendar en línea hasta {deadlineHours} horas antes de tu cita.</Caption>
          )}
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
              const active = CANCELLABLE_STATUSES.has(booking.status);
              const canChange = active && (!policy || isWithinClientChangeWindow(policy, booking.startsAt, now));
              const showActions = active || booking.status === "completed";
              return (
                <Panel key={booking.id} padding="sm" className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <Title>{variant ? variant.serviceName : "Servicio"}</Title>
                      {variant && (
                        <Caption>
                          {variantAxisLabel} {variant.label ?? "—"}
                        </Caption>
                      )}
                    </div>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <MetaItem icon={<CalendarDays />}>{formatDateTime(booking.startsAt)}</MetaItem>
                    <Price clp={booking.priceClp} size="sm" />
                  </div>

                  {/* SPEC 21: abono sin recibir, con los datos para transferir. */}
                  {active && booking.depositClp !== null && booking.depositPaidAt === null && depositInfo && (
                    <DepositInstructions amountClp={booking.depositClp} info={depositInfo} compact />
                  )}
                  {booking.depositClp !== null && booking.depositPaidAt !== null && (
                    <Caption>Abono de ${booking.depositClp.toLocaleString("es-CL")} recibido.</Caption>
                  )}

                  {showActions && (
                    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-outline-variant pt-3">
                      {canChange && (
                        <>
                          <BrandButton size="sm" variant="outline" href={`/${slug}/cuenta/reagendar/${booking.id}`}>
                            Reagendar
                          </BrandButton>
                          <CancelBookingButton bookingId={booking.id} />
                        </>
                      )}
                      {active && !canChange && (
                        <Caption className="mr-auto">
                          Para cambiar esta cita, escríbele a la profesional.
                          {professionalWhatsApp && (
                            <>
                              {" "}
                              <a
                                href={professionalWhatsApp}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-foreground underline underline-offset-4"
                              >
                                WhatsApp
                              </a>
                            </>
                          )}
                        </Caption>
                      )}
                      {/* SPEC 21: "vuelve a reservar", mismo servicio y variante si siguen activos. */}
                      {booking.status === "completed" && variant?.active && variant.serviceActive && (
                        <BrandButton
                          size="sm"
                          href={`/${slug}/reservar?service=${variant.serviceId}&variant=${variant.id}`}
                        >
                          Reservar de nuevo
                        </BrandButton>
                      )}
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

        {waitlist.length > 0 && (
          <Panel padding="sm" className="flex flex-col gap-3">
            <Title>Lista de espera</Title>
            <Caption>Te avisamos por correo si se libera una hora esos días.</Caption>
            <ul className="flex flex-col divide-y divide-outline-variant">
              {waitlist.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    {new Date(`${entry.date}T12:00:00Z`).toLocaleDateString("es-CL", {
                      timeZone: "UTC",
                      dateStyle: "full",
                    })}
                    {entry.notifiedAt && <span className="text-muted-foreground"> · ya te avisamos</span>}
                  </span>
                  <LeaveWaitlistButton entryId={entry.id} />
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {/* Discreta y al final: es una acción de servicio, no debería
            competir en tono con el título de la página. */}
        <SignOutButton slug={slug} />
      </Section>
    </Container>
  );
}
