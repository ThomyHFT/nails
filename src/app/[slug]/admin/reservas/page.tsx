import { eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CalendarClock, CalendarDays } from "lucide-react";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { db } from "@/server/infrastructure/db/client";
import { serviceVariants, services } from "@/server/infrastructure/db/schema/services";
import { users } from "@/server/infrastructure/db/schema/users";
import type { Booking, BookingStatus } from "@/server/domain/booking/booking.entity";
import { BookingActions } from "@/app/[slug]/admin/reservas/BookingActions";
import {
  AdminPageHeader,
  Caption,
  Chip,
  EmptyState,
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

const STATUS_TONES: Record<BookingStatus, "success" | "warning" | "danger" | "neutral"> = {
  pending: "warning",
  confirmed: "success",
  completed: "neutral",
  cancelled: "danger",
  no_show: "danger",
};

const STATUS_ORDER: BookingStatus[] = ["pending", "confirmed", "completed", "no_show", "cancelled"];

const NAIL_LENGTH_LABELS: Record<string, string> = {
  short: "Corta",
  medium: "Media",
  long: "Larga",
  single: "Única",
};

function formatDateTime(date: Date) {
  return date.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
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

  const [clientRows, variantRows] = await Promise.all([
    clientIds.length
      ? db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, clientIds))
      : Promise.resolve([]),
    variantIds.length
      ? db
          .select({ id: serviceVariants.id, nailLength: serviceVariants.nailLength, serviceName: services.name })
          .from(serviceVariants)
          .innerJoin(services, eq(serviceVariants.serviceId, services.id))
          .where(inArray(serviceVariants.id, variantIds))
      : Promise.resolve([]),
  ]);

  const clientById = new Map(clientRows.map((c) => [c.id, c]));
  const variantById = new Map(variantRows.map((v) => [v.id, v]));

  const strikesByClient = new Map<string, number>();
  for (const clientId of clientIds) {
    strikesByClient.set(clientId, await bookingRepository.countClientStrikes(professional.id, clientId));
  }

  const bookingsByStatus = new Map<BookingStatus, Booking[]>();
  for (const status of STATUS_ORDER) bookingsByStatus.set(status, []);
  for (const booking of bookings) bookingsByStatus.get(booking.status)?.push(booking);

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <AdminPageHeader title="Reservas" description="Agrupadas por estado, las pendientes primero." />

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
                const strikes = strikesByClient.get(booking.clientUserId) ?? 0;

                return (
                  <Panel key={booking.id} padding="sm" className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <Title>{client?.name ?? "Clienta"}</Title>
                        {client?.email && <Caption className="text-xs">{client.email}</Caption>}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <StatusBadge tone={STATUS_TONES[booking.status]}>{booking.status}</StatusBadge>
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
                        ? `${variant.serviceName} · ${NAIL_LENGTH_LABELS[variant.nailLength] ?? variant.nailLength}`
                        : booking.serviceVariantId}
                    </Caption>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <MetaItem icon={<CalendarDays />}>{formatDateTime(booking.startsAt)}</MetaItem>
                      <Price clp={booking.priceClp} size="sm" />
                    </div>

                    <div className="flex justify-end border-t border-outline-variant pt-3">
                      <BookingActions bookingId={booking.id} status={booking.status} />
                    </div>
                  </Panel>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
