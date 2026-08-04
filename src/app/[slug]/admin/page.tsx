import { eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowRight, Banknote, CalendarCheck, CalendarDays, Clock } from "lucide-react";
import { db } from "@/server/infrastructure/db/client";
import { serviceVariants, services } from "@/server/infrastructure/db/schema/services";
import { users } from "@/server/infrastructure/db/schema/users";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { startOfDayInZone } from "@/server/application/booking/zoned-time";
import {
  ActionLink,
  AdminPageHeader,
  AppointmentRow,
  EmptyState,
  Overline,
  StatCard,
} from "@/components/brand";


// Sin timeZone explícito, un Server Component formatea con la hora del
// runtime (UTC en Vercel), no la de Chile: una reserva a las 10:00 le
// aparecía a la profesional como 14:00.
function formatTime(date: Date) {
  return date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });
}

export default async function AdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  if (!professional) {
    notFound();
  }

  const bookings = await new DrizzleBookingRepository().listByProfessional(professional.id);

  const now = new Date();
  const todayStart = startOfDayInZone(now, "America/Santiago");
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

  const todaysBookings = bookings
    .filter(
      (b) =>
        b.startsAt >= todayStart && b.startsAt < todayEnd && (b.status === "pending" || b.status === "confirmed"),
    )
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const pendingCount = todaysBookings.filter((b) => b.status === "pending").length;

  // Ingresos de los últimos 7 días sobre reservas completadas. `priceClp` es la
  // foto congelada al reservar, así que la suma no cambia si después suben los
  // precios del catálogo.
  const weekRevenueClp = bookings
    .filter((b) => b.status === "completed" && b.startsAt >= weekStart && b.startsAt < todayEnd)
    .reduce((total, b) => total + b.priceClp, 0);

  const clientIds = Array.from(new Set(todaysBookings.map((b) => b.clientUserId)));
  const variantIds = Array.from(new Set(todaysBookings.map((b) => b.serviceVariantId)));

  const [clientRows, variantRows] = await Promise.all([
    clientIds.length
      ? db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, clientIds))
      : Promise.resolve([]),
    variantIds.length
      ? db
          .select({ id: serviceVariants.id, label: serviceVariants.label, serviceName: services.name })
          .from(serviceVariants)
          .innerJoin(services, eq(serviceVariants.serviceId, services.id))
          .where(inArray(serviceVariants.id, variantIds))
      : Promise.resolve([]),
  ]);

  const clientById = new Map(clientRows.map((c) => [c.id, c]));
  const variantById = new Map(variantRows.map((v) => [v.id, v]));

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <AdminPageHeader
        title="Resumen del día"
        description={now.toLocaleDateString("es-CL", { dateStyle: "full", timeZone: "America/Santiago" })}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<CalendarDays className="size-5" />}
          label="Citas hoy"
          value={todaysBookings.length}
          hint={pendingCount > 0 ? `${pendingCount} por confirmar` : undefined}
        />
        <StatCard
          icon={<Banknote className="size-5" />}
          label="Ingresos 7 días"
          value={`$${weekRevenueClp.toLocaleString("es-CL")}`}
          hint="Reservas completadas"
        />
        <StatCard
          icon={<Clock className="size-5" />}
          label="Próxima cita"
          value={todaysBookings.length > 0 ? formatTime(todaysBookings[0].startsAt) : "—"}
        />
      </div>

      <section className="flex flex-col gap-4">
        <Overline>Próximas citas de hoy</Overline>

        {todaysBookings.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck className="size-5" />}
            title="Sin citas para hoy"
            description="No tienes reservas pendientes ni confirmadas para el día de hoy."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {todaysBookings.map((booking) => {
              const client = clientById.get(booking.clientUserId);
              const variant = variantById.get(booking.serviceVariantId);
              return (
                <AppointmentRow
                  key={booking.id}
                  href={`/${slug}/admin/reservas`}
                  timeRange={formatTime(booking.startsAt)}
                  status={booking.status === "confirmed" ? "Confirmada" : "Pendiente"}
                  statusTone={booking.status === "confirmed" ? "success" : "warning"}
                  serviceName={
                    variant
                      ? `${variant.serviceName} · ${variant.label ?? "—"}`
                      : "Servicio"
                  }
                  clientName={client?.name ?? "Cliente"}
                  priceClp={booking.priceClp}
                />
              );
            })}
          </div>
        )}
      </section>

      <ActionLink href={`/${slug}/admin/reservas`} icon={<ArrowRight className="size-4" />}>
        Ver todas las reservas
      </ActionLink>
    </div>
  );
}
