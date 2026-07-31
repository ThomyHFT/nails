import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/infrastructure/db/client";
import { serviceVariants, services } from "@/server/infrastructure/db/schema/services";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { CancelBookingButton } from "@/app/[slug]/cuenta/CancelBookingButton";

const CANCELLABLE_STATUSES = new Set(["pending", "confirmed"]);

function formatDateTime(date: Date) {
  return date.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
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

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">Mi cuenta</h1>
      <p>
        Sesión iniciada como <strong>{session.user.email}</strong>
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Mis reservas</h2>
        {bookings.length === 0 && <p className="text-sm text-muted-foreground">Todavía no tienes reservas.</p>}
        <ul className="flex flex-col gap-3">
          {bookings.map((booking) => {
            const variant = variantById.get(booking.serviceVariantId);
            return (
              <li key={booking.id} className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">
                    {variant ? `${variant.serviceName} (${variant.nailLength})` : booking.serviceVariantId}
                  </span>
                  <span>{formatDateTime(booking.startsAt)}</span>
                  <span className="capitalize">{booking.status.replace("_", " ")}</span>
                </div>
                {CANCELLABLE_STATUSES.has(booking.status) && <CancelBookingButton bookingId={booking.id} />}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
