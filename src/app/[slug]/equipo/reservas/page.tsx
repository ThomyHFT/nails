import { notFound } from "next/navigation";
import { CalendarDays, MessageCircle } from "lucide-react";
import { AdminPageHeader, Caption, EmptyState, MetaItem, Overline, Panel, StatusBadge, Title } from "@/components/brand";
import type { BookingStatus } from "@/server/domain/booking/booking.entity";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { getSessionStaff } from "@/server/interface/staff-context";
import { BookingActions } from "@/app/[slug]/admin/reservas/BookingActions";
import { whatsAppUrl } from "@/app/[slug]/(public)/links";

const STATUS: Record<BookingStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  pending: { label: "Pendiente", tone: "warning" },
  confirmed: { label: "Confirmada", tone: "success" },
  completed: { label: "Completada", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "danger" },
  no_show: { label: "No asistió", tone: "danger" },
};

/**
 * Reservas de la integrante (SPEC 22): las próximas activas para confirmar,
 * completar o mover, y las últimas pasadas. Sin precios ni datos de otras.
 */
export default async function StaffReservasPage() {
  const staffSession = await getSessionStaff();
  if (!staffSession) notFound();
  const { professional, staff } = staffSession;

  const now = new Date();
  const all = await new DrizzleBookingRepository().listByStaff(staff.id);
  const upcoming = all
    .filter((b) => (b.status === "pending" || b.status === "confirmed") && b.endsAt >= new Date(now.getTime() - 12 * 3_600_000))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = all.filter((b) => !upcoming.includes(b)).slice(0, 30);

  const users = await new DrizzleUserRepository().findManyByIds([...new Set(all.map((b) => b.clientUserId))]);
  const clientById = new Map(users.map((u) => [u.id, u]));
  const services = await new DrizzleServicesRepository().listByProfessional(professional.id);
  const serviceByVariant = new Map(services.flatMap((s) => s.variants.map((v) => [v.id, s.name] as const)));
  const format = (date: Date) =>
    date.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: professional.timezone });

  function Row({ bookingId }: { bookingId: string }) {
    const booking = all.find((b) => b.id === bookingId)!;
    const client = clientById.get(booking.clientUserId);
    const status = STATUS[booking.status];
    return (
      <div id={booking.id} className="scroll-mt-20">
        <Panel padding="sm" className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <Title>{client?.name ?? "Clienta"}</Title>
              <Caption>{serviceByVariant.get(booking.serviceVariantId) ?? "Servicio"}</Caption>
              {client?.phone && (
                <a
                  href={whatsAppUrl(client.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <MessageCircle className="size-3.5" aria-hidden />
                  {client.phone}
                </a>
              )}
            </div>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          </div>
          {booking.clientNote && (
            <blockquote className="rounded-lg bg-surface-2 px-3 py-2 text-sm">“{booking.clientNote}”</blockquote>
          )}
          <MetaItem icon={<CalendarDays />}>{format(booking.startsAt)}</MetaItem>
          {(booking.status === "pending" || booking.status === "confirmed") && (
            <div className="flex justify-end border-t border-outline-variant pt-3">
              <BookingActions
                bookingId={booking.id}
                status={booking.status}
                depositPending={booking.depositClp !== null && booking.depositPaidAt === null}
              />
            </div>
          )}
        </Panel>
      </div>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <AdminPageHeader title="Mis reservas" description="Las tuyas. Para cambiar el horario o los servicios que haces, habla con la dueña." />
      {upcoming.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-5" />} title="No tienes horas próximas" description="Cuando te reserven, aparecen acá." />
      ) : (
        <section className="flex flex-col gap-3">
          <Overline>Próximas</Overline>
          {upcoming.map((b) => (
            <Row key={b.id} bookingId={b.id} />
          ))}
        </section>
      )}
      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <Overline>Anteriores</Overline>
          {past.map((b) => (
            <Row key={b.id} bookingId={b.id} />
          ))}
        </section>
      )}
    </div>
  );
}
