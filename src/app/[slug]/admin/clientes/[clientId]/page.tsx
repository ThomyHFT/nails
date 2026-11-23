import Link from "next/link";
import { notFound } from "next/navigation";
import { inArray, eq } from "drizzle-orm";
import { ArrowLeft, Mail, MessageCircle } from "lucide-react";
import { ClientNotFoundError, GetClientProfileUseCase } from "@/server/application/client/client-profile.use-case";
import type { BookingStatus } from "@/server/domain/booking/booking.entity";
import { isPlaceholderEmail } from "@/server/domain/user/client-contact";
import { db } from "@/server/infrastructure/db/client";
import { serviceVariants, services } from "@/server/infrastructure/db/schema/services";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleClientNotesRepository } from "@/server/infrastructure/repositories/drizzle-client-notes.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { whatsAppUrl } from "@/app/[slug]/(public)/links";
import { ClientNoteEditor } from "@/app/[slug]/admin/clientes/[clientId]/ClientNoteEditor";
import { AdminPageHeader, Caption, Chip, Overline, Panel, Price, StatCard, StatusBadge } from "@/components/brand";

const STATUS: Record<BookingStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  pending: { label: "Pendiente", tone: "warning" },
  confirmed: { label: "Confirmada", tone: "success" },
  completed: { label: "Completada", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "danger" },
  no_show: { label: "No asistió", tone: "danger" },
};

export default async function ClientProfilePage({ params }: { params: Promise<{ slug: string; clientId: string }> }) {
  const { slug, clientId } = await params;
  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  if (!professional) notFound();

  let profile;
  try {
    profile = await new GetClientProfileUseCase(
      new DrizzleBookingRepository(),
      new DrizzleUserRepository(),
      new DrizzleClientNotesRepository(),
    ).execute(professional.id, clientId);
  } catch (err) {
    if (err instanceof ClientNotFoundError) notFound();
    throw err;
  }

  const variantIds = Array.from(new Set(profile.bookings.map((b) => b.serviceVariantId)));
  const variantRows = variantIds.length
    ? await db
        .select({ id: serviceVariants.id, label: serviceVariants.label, serviceName: services.name })
        .from(serviceVariants)
        .innerJoin(services, eq(serviceVariants.serviceId, services.id))
        .where(inArray(serviceVariants.id, variantIds))
    : [];
  const variantById = new Map(variantRows.map((v) => [v.id, v]));

  const tz = professional.timezone;
  const formatDate = (date: Date) => date.toLocaleDateString("es-CL", { dateStyle: "medium", timeZone: tz });
  const formatDateTime = (date: Date) =>
    date.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: tz });
  const { client, totals } = profile;
  const realEmail = isPlaceholderEmail(client.email) ? null : client.email;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <Link
        href={`/${slug}/admin/clientes`}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Clientes
      </Link>

      <AdminPageHeader
        title={client.name}
        description={`Clienta desde ${formatDate(profile.bookings.at(-1)?.startsAt ?? client.createdAt)}`}
        action={
          <div className="flex flex-wrap gap-3 text-sm">
            {client.phone && (
              <a
                href={whatsAppUrl(client.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
              >
                <MessageCircle className="size-4" aria-hidden /> {client.phone}
              </a>
            )}
            {realEmail && (
              <a href={`mailto:${realEmail}`} className="inline-flex items-center gap-1.5 text-foreground hover:underline">
                <Mail className="size-4" aria-hidden /> {realEmail}
              </a>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Reservas" value={`${totals.completed} / ${totals.bookings}`} />
        <StatCard label="Gasto total" value={`$${totals.spentClp.toLocaleString("es-CL")}`} />
        <StatCard label="Última visita" value={totals.lastVisitAt ? formatDate(totals.lastVisitAt) : "—"} />
        <StatCard label="Próxima" value={totals.nextBookingAt ? formatDate(totals.nextBookingAt) : "—"} />
      </div>

      {(totals.strikes > 0 || totals.noShows > 0) && (
        <div className="flex flex-wrap gap-2">
          {totals.strikes > 0 && <Chip tone="warning">{totals.strikes} cancelación(es) suya(s)</Chip>}
          {totals.noShows > 0 && <Chip tone="warning">{totals.noShows} no asistió</Chip>}
        </div>
      )}

      <Panel padding="sm">
        <ClientNoteEditor clientId={client.id} initialBody={profile.note?.body ?? ""} />
      </Panel>

      <section className="flex flex-col gap-3">
        <Overline>Historial</Overline>
        <Panel padding="sm" className="flex flex-col divide-y divide-outline-variant">
          {profile.bookings.map((booking) => {
            const variant = variantById.get(booking.serviceVariantId);
            const status = STATUS[booking.status];
            return (
              <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium">
                    {variant ? `${variant.serviceName}${variant.label ? ` · ${variant.label}` : ""}` : "Servicio"}
                  </span>
                  <Caption className="text-xs">{formatDateTime(booking.startsAt)}</Caption>
                  {booking.clientNote && <Caption className="text-xs italic">“{booking.clientNote}”</Caption>}
                </div>
                <div className="flex items-center gap-3">
                  <Price clp={booking.priceClp} size="sm" />
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </div>
              </div>
            );
          })}
        </Panel>
      </section>
    </div>
  );
}
