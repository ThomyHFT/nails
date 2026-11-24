import { eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CalendarClock, CalendarDays, MessageCircle } from "lucide-react";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { db } from "@/server/infrastructure/db/client";
import { designs } from "@/server/infrastructure/db/schema/designs";
import { serviceVariants, services } from "@/server/infrastructure/db/schema/services";
import { users } from "@/server/infrastructure/db/schema/users";
import { reviews } from "@/server/infrastructure/db/schema/content";
import { siteUrl } from "@/app/_lib/site-url";
import type { Booking, BookingStatus } from "@/server/domain/booking/booking.entity";
import { BookingActions } from "@/app/[slug]/admin/reservas/BookingActions";
import { ManualBookingForm } from "@/app/[slug]/admin/reservas/ManualBookingForm";
import { ListServicesUseCase } from "@/server/application/service/list-services.use-case";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import { whatsAppUrl } from "@/app/[slug]/(public)/links";
import { isPlaceholderEmail } from "@/server/domain/user/client-contact";
import {
  AdminPageHeader,
  Caption,
  Chip,
  EmptyState,
  MediaFrame,
  MetaItem,
  Overline,
  Panel,
  Price,
  StatusBadge,
  Title,
} from "@/components/brand";

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pendientes",
  confirmed: "Confirmadas",
  completed: "Completadas",
  cancelled: "Canceladas",
  no_show: "No show",
};

const STATUS_BADGE_LABELS: Record<BookingStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

const STATUS_TONES: Record<BookingStatus, "success" | "warning" | "danger" | "neutral"> = {
  pending: "warning",
  confirmed: "success",
  completed: "neutral",
  cancelled: "danger",
  no_show: "danger",
};

const STATUS_ORDER: BookingStatus[] = ["pending", "confirmed", "completed", "no_show", "cancelled"];


function formatDateTime(date: Date) {
  return date.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" });
}

export default async function ReservasAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  if (!professional) {
    notFound();
  }

  const bookingRepository = new DrizzleBookingRepository();
  const bookings = await bookingRepository.listByProfessional(professional.id);

  const clientIds = Array.from(new Set(bookings.map((b) => b.clientUserId)));
  const variantIds = Array.from(new Set(bookings.map((b) => b.serviceVariantId)));
  const designIds = Array.from(new Set(bookings.map((b) => b.designId).filter((id): id is string => id !== null)));
  const completedIds = bookings.filter((b) => b.status === "completed").map((b) => b.id);

  const [clientRows, variantRows, designRows, reviewRows] = await Promise.all([
    clientIds.length
      ? db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone }).from(users).where(inArray(users.id, clientIds))
      : Promise.resolve([]),
    variantIds.length
      ? db
          .select({ id: serviceVariants.id, label: serviceVariants.label, serviceName: services.name })
          .from(serviceVariants)
          .innerJoin(services, eq(serviceVariants.serviceId, services.id))
          .where(inArray(serviceVariants.id, variantIds))
      : Promise.resolve([]),
    designIds.length
      ? db.select({ id: designs.id, referenceImageUrl: designs.referenceImageUrl }).from(designs).where(inArray(designs.id, designIds))
      : Promise.resolve([]),
    completedIds.length
      ? db.select({ bookingId: reviews.bookingId }).from(reviews).where(inArray(reviews.bookingId, completedIds))
      : Promise.resolve([]),
  ]);
  const reviewedBookingIds = new Set(reviewRows.map((r) => r.bookingId));
  const baseUrl = siteUrl();

  const clientById = new Map(clientRows.map((c) => [c.id, c]));
  const variantById = new Map(variantRows.map((v) => [v.id, v]));
  const designById = new Map(designRows.map((d) => [d.id, d]));

  const strikesByClient = new Map<string, number>();
  for (const clientId of clientIds) {
    strikesByClient.set(clientId, await bookingRepository.countClientStrikes(professional.id, clientId));
  }

  // Opciones del formulario de reserva manual (SPEC 18): solo servicios y
  // variantes activos, y las clientas que ya reservaron con ella.
  const serviceList = await new ListServicesUseCase(new DrizzleServicesRepository()).execute(professional.id);
  const variantOptions = serviceList
    .filter((service) => service.active)
    .flatMap((service) =>
      service.variants
        .filter((variant) => variant.active)
        .map((variant) => ({
          id: variant.id,
          label: `${service.name} · ${variant.label} · $${variant.priceClp.toLocaleString("es-CL")} · ${variant.durationMinutes} min`,
        })),
    );
  const clientOptions = clientRows
    .map((client) => ({ id: client.id, name: client.name, phone: client.phone }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const bookingsByStatus = new Map<BookingStatus, Booking[]>();
  for (const status of STATUS_ORDER) bookingsByStatus.set(status, []);
  for (const booking of bookings) bookingsByStatus.get(booking.status)?.push(booking);

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <AdminPageHeader
        title="Reservas"
        description="Agrupadas por estado, las pendientes primero."
        action={
          // <a> y no Link: Link precargaría el CSV en segundo plano.
          <a
            href="/api/export/reservas"
            download
            className="inline-flex h-9 items-center rounded-pill border border-outline-variant px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Exportar CSV
          </a>
        }
      />

      <ManualBookingForm variants={variantOptions} clients={clientOptions} />

      {bookings.length === 0 && (
        <EmptyState
          icon={<CalendarClock className="size-5" />}
          title="Todavía no hay reservas"
          description="Cuando una clienta agende desde tu micrositio, la verás acá."
        />
      )}

      {STATUS_ORDER.map((status) => {
        const rows = bookingsByStatus.get(status) ?? [];
        if (rows.length === 0) return null;

        return (
          <section key={status} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Overline>{STATUS_LABELS[status]}</Overline>
              <Chip>{rows.length}</Chip>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {rows.map((booking) => {
                const client = clientById.get(booking.clientUserId);
                const variant = variantById.get(booking.serviceVariantId);
                const design = booking.designId ? designById.get(booking.designId) : undefined;
                const strikes = strikesByClient.get(booking.clientUserId) ?? 0;
                const depositPending = booking.depositClp !== null && booking.depositPaidAt === null;
                // SPEC 21: pedir la opinión por WhatsApp con el enlace ya escrito.
                const askReviewUrl =
                  booking.status === "completed" && !reviewedBookingIds.has(booking.id) && client?.phone
                    ? whatsAppUrl(
                        client.phone,
                        `¡Hola ${client.name.split(" ")[0]}! Gracias por venir a ${professional.businessName}. ¿Me dejas tu opinión? ${baseUrl}/${slug}/cuenta/opinar/${booking.id}`,
                      )
                    : null;

                return (
                  // El id es el ancla que usa el correo "nueva solicitud" para
                  // llevar directo a esta reserva; scroll-mt- compensa el
                  // header pegado del admin.
                  <div key={booking.id} id={booking.id} className="scroll-mt-20">
                    <Panel padding="sm" className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-1">
                          <Title>{client?.name ?? "Cliente"}</Title>
                          {/* SPEC 18: el correo de relleno de una clienta agendada a mano no se muestra. */}
                          {client?.email && !isPlaceholderEmail(client.email) && (
                            <Caption className="truncate text-xs">{client.email}</Caption>
                          )}
                          {client?.phone && (
                            <a
                              href={whatsAppUrl(client.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex w-fit items-center gap-1.5 rounded-sm text-xs font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <MessageCircle className="size-3.5" aria-hidden />
                              {client.phone}
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <StatusBadge tone={STATUS_TONES[booking.status]}>{STATUS_BADGE_LABELS[booking.status]}</StatusBadge>
                          {/* Los strikes son la señal que decide si conviene
                              confirmar: van junto al estado, no enterrados en la
                              línea del nombre. */}
                          {strikes > 0 && (
                            <Chip tone="danger">
                              {strikes} strike{strikes > 1 ? "s" : ""}
                            </Chip>
                          )}
                        </div>
                      </div>

                      <Caption>
                        {variant
                          ? `${variant.serviceName} · ${variant.label ?? "—"}`
                          : booking.serviceVariantId}
                      </Caption>

                      {booking.clientNote && (
                        <blockquote className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-foreground">
                          “{booking.clientNote}”
                        </blockquote>
                      )}

                      {design?.referenceImageUrl && (
                        <MediaFrame
                          src={design.referenceImageUrl}
                          alt="Foto de referencia del diseño"
                          ratio="square"
                          className="max-w-24"
                        />
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <MetaItem icon={<CalendarDays />}>{formatDateTime(booking.startsAt)}</MetaItem>
                        <Price clp={booking.priceClp} size="sm" />
                      </div>

                      {booking.depositClp !== null && (
                        <Chip tone={depositPending ? "warning" : "success"}>
                          {depositPending
                            ? `Abono pendiente · $${booking.depositClp.toLocaleString("es-CL")}`
                            : `Abono recibido · $${booking.depositClp.toLocaleString("es-CL")}`}
                        </Chip>
                      )}

                      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-outline-variant pt-3">
                        {askReviewUrl && (
                          <a
                            href={askReviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-sm text-xs font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <MessageCircle className="size-3.5" aria-hidden />
                            Pedir opinión
                          </a>
                        )}
                        <BookingActions bookingId={booking.id} status={booking.status} depositPending={depositPending} />
                      </div>
                    </Panel>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
