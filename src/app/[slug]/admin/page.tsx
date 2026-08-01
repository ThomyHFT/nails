import { eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/infrastructure/db/client";
import { serviceVariants, services } from "@/server/infrastructure/db/schema/services";
import { users } from "@/server/infrastructure/db/schema/users";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

function formatTime(date: Date) {
  return date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

export default async function AdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  if (!professional) {
    notFound();
  }

  const bookings = await new DrizzleBookingRepository().listByProfessional(professional.id);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const todaysBookings = bookings
    .filter(
      (b) =>
        b.startsAt >= todayStart &&
        b.startsAt < todayEnd &&
        (b.status === "pending" || b.status === "confirmed"),
    )
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const clientIds = Array.from(new Set(todaysBookings.map((b) => b.clientUserId)));
  const variantIds = Array.from(new Set(todaysBookings.map((b) => b.serviceVariantId)));

  const [clientRows, variantRows] = await Promise.all([
    clientIds.length
      ? db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, clientIds))
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--tenant-font-heading)" }}>
          Resumen del día
        </h1>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {now.toLocaleDateString("es-CL", { dateStyle: "full" })}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Próximas citas de hoy</h2>
        {todaysBookings.length === 0 && (
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            No tienes citas pendientes o confirmadas para hoy.
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {todaysBookings.map((booking) => {
            const client = clientById.get(booking.clientUserId);
            const variant = variantById.get(booking.serviceVariantId);
            return (
              <li
                key={booking.id}
                className="flex items-center justify-between gap-4 p-3 text-sm"
                style={{
                  background: "var(--card)",
                  color: "var(--card-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                }}
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{client?.name ?? "Clienta"}</span>
                  <span style={{ color: "var(--muted-foreground)" }}>
                    {variant ? `${variant.serviceName} (${variant.nailLength})` : booking.serviceVariantId}
                  </span>
                </div>
                <span className="font-medium">{formatTime(booking.startsAt)}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <Link href={`/${slug}/admin/reservas`} className="w-fit text-sm font-medium" style={{ color: "var(--primary)" }}>
        Ver todas las reservas →
      </Link>
    </div>
  );
}
