import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReportUseCase } from "@/server/application/report/report.use-case";
import { isMonth, previousMonth } from "@/server/domain/report/monthly-report";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { AdminPageHeader, BrandButton, Caption, Overline, Panel, StatCard } from "@/components/brand";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function nextMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  return new Date(`${month}-15T12:00:00Z`).toLocaleDateString("es-CL", { month: "long", year: "numeric", timeZone: "UTC" });
}

const clp = (value: number) => `$${value.toLocaleString("es-CL")}`;

function Delta({ current, previous, format }: { current: number; previous: number; format: (n: number) => string }) {
  if (previous === 0) return <span>Mes anterior: {format(previous)}</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  return (
    <span>
      {pct >= 0 ? "▲" : "▼"} {Math.abs(pct)}% contra {format(previous)}
    </span>
  );
}

/** Cómo le fue a la profesional en el mes (SPEC 20). */
export default async function ReportesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const { slug } = await params;
  const { mes } = await searchParams;
  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  if (!professional) notFound();

  const currentMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: professional.timezone,
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const month = isMonth(mes) ? mes : currentMonth;

  const report = await new ReportUseCase(
    new DrizzleBookingRepository(),
    new DrizzleUserRepository(),
    new DrizzleServicesRepository(),
  ).monthly(professional, month);

  const base = `/${slug}/admin/reportes`;
  const activeTotal = report.byWeekday.reduce((a, b) => a + b, 0);
  const maxWeekday = Math.max(1, ...report.byWeekday);

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <AdminPageHeader
        title="Reportes"
        description={<span className="capitalize">{monthLabel(month)}</span>}
        action={
          <div className="flex items-center gap-2">
            <BrandButton size="sm" variant="outline" href={`${base}?mes=${previousMonth(month)}`}>
              <ChevronLeft className="size-4" />
              <span className="sr-only">Mes anterior</span>
            </BrandButton>
            <BrandButton size="sm" variant="outline" href={base}>
              Este mes
            </BrandButton>
            {month < currentMonth && (
              <BrandButton size="sm" variant="outline" href={`${base}?mes=${nextMonth(month)}`}>
                <ChevronRight className="size-4" />
                <span className="sr-only">Mes siguiente</span>
              </BrandButton>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ingresos"
          value={clp(report.revenueClp)}
          hint={<Delta current={report.revenueClp} previous={report.previous.revenueClp} format={clp} />}
        />
        <StatCard
          label="Citas completadas"
          value={report.byStatus.completed}
          hint={<Delta current={report.byStatus.completed} previous={report.previous.completed} format={String} />}
        />
        <StatCard label="Ticket promedio" value={clp(report.averageTicketClp)} />
        <StatCard
          label="No asistieron"
          value={report.noShowRate === null ? "—" : `${Math.round(report.noShowRate * 100)}%`}
          hint={`${report.byStatus.no_show} de ${report.byStatus.completed + report.byStatus.no_show} citas`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel padding="sm" className="flex flex-col gap-3">
          <Overline>Clientas</Overline>
          <div className="flex gap-6">
            <div>
              <p className="text-2xl font-semibold">{report.newClients}</p>
              <Caption>nuevas</Caption>
            </div>
            <div>
              <p className="text-2xl font-semibold">{report.returningClients}</p>
              <Caption>volvieron</Caption>
            </div>
          </div>
          <Caption className="text-xs">
            {report.byStatus.pending + report.byStatus.confirmed} reservas por atender · {report.byStatus.cancelled} canceladas
          </Caption>
        </Panel>

        <Panel padding="sm" className="flex flex-col gap-3">
          <Overline>Servicios más pedidos</Overline>
          {report.topServices.length === 0 ? (
            <Caption>Sin reservas este mes.</Caption>
          ) : (
            <ol className="flex flex-col gap-2">
              {report.topServices.map((service) => (
                <li key={service.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{service.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {service.bookings} · {clp(service.revenueClp)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <Panel padding="sm" className="flex flex-col gap-4">
        <Overline>Reservas por día de la semana</Overline>
        {activeTotal === 0 ? (
          <Caption>Sin reservas este mes.</Caption>
        ) : (
          <div className="flex h-40 items-end gap-2" role="img" aria-label={WEEKDAYS.map((d, i) => `${d}: ${report.byWeekday[i]}`).join(", ")}>
            {report.byWeekday.map((count, i) => (
              <div key={WEEKDAYS[i]} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{count}</span>
                <div className="w-full rounded-t-md bg-primary" style={{ height: `${(count / maxWeekday) * 100}%`, minHeight: count ? 4 : 0 }} />
                <span className="text-xs">{WEEKDAYS[i]}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Caption className="text-xs">
        Ingresos = suma de las citas marcadas como completadas, al precio congelado al reservar. ¿Necesitas el detalle?{" "}
        <a href="/api/export/reservas" download className="underline underline-offset-4">
          Exporta tus reservas en CSV
        </a>
        .
      </Caption>
    </div>
  );
}
