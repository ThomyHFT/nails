import { eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { db } from "@/server/infrastructure/db/client";
import { serviceVariants, services } from "@/server/infrastructure/db/schema/services";
import { users } from "@/server/infrastructure/db/schema/users";
import type { Booking, BookingStatus } from "@/server/domain/booking/booking.entity";
import { BookingActions } from "@/app/[slug]/admin/reservas/BookingActions";

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pendientes",
  confirmed: "Confirmadas",
  completed: "Completadas",
  cancelled: "Canceladas",
  no_show: "No show",
};

const STATUS_ORDER: BookingStatus[] = ["pending", "confirmed", "completed", "no_show", "cancelled"];

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
    <div className="flex max-w-3xl flex-col gap-8">
      <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--tenant-font-heading)" }}>
        Reservas
      </h1>

      {STATUS_ORDER.map((status) => {
        const rows = bookingsByStatus.get(status) ?? [];
        if (rows.length === 0) return null;

        return (
          <section key={status} className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">{STATUS_LABELS[status]}</h2>
            <ul className="flex flex-col gap-3">
              {rows.map((booking) => {
                const client = clientById.get(booking.clientUserId);
                const variant = variantById.get(booking.serviceVariantId);
                const strikes = strikesByClient.get(booking.clientUserId) ?? 0;

                return (
                  <li
                    key={booking.id}
                    className="flex items-center justify-between gap-4 p-3"
                    style={{
                      background: "var(--card)",
                      color: "var(--card-foreground)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="font-medium">
                        {client?.name ?? "Clienta"} {strikes > 0 && `— ${strikes} strike${strikes > 1 ? "s" : ""}`}
                      </span>
                      <span style={{ color: "var(--muted-foreground)" }}>
                        {variant ? `${variant.serviceName} (${variant.nailLength})` : booking.serviceVariantId}
                      </span>
                      <span>{formatDateTime(booking.startsAt)}</span>
                      <span>${booking.priceClp.toLocaleString("es-CL")}</span>
                    </div>
                    <BookingActions bookingId={booking.id} status={booking.status} />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {bookings.length === 0 && (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Todavía no hay reservas.
        </p>
      )}
    </div>
  );
}
