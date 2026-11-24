import Link from "next/link";
import type { ReactNode } from "react";
import { eq, inArray } from "drizzle-orm";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { utcToZonedMinutesOfDay, zonedDateTimeToUtc } from "@/server/application/booking/zoned-time";
import {
  addDays,
  agendaHourRange,
  isLocalDate,
  localDateInZone,
  mondayOf,
  weekDates,
} from "@/server/domain/booking/agenda-week";
import type { Professional } from "@/server/domain/professional/professional.entity";
import { db } from "@/server/infrastructure/db/client";
import { serviceVariants, services } from "@/server/infrastructure/db/schema/services";
import { users } from "@/server/infrastructure/db/schema/users";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { AdminPageHeader, BrandButton, Caption, Panel } from "@/components/brand";
import { cn } from "@/lib/utils";

const HOUR_HEIGHT_PX = 48;

function dayLabel(date: string, style: "short" | "long") {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("es-CL", {
    weekday: style,
    day: "numeric",
    ...(style === "long" ? { month: "long" } : {}),
    timeZone: "UTC",
  });
}

/**
 * Agenda de la semana (SPEC 19): las reservas pendientes y confirmadas como
 * bloques sobre una grilla de horas. En el teléfono, un día a la vez. La usan
 * el panel de la dueña (todo el negocio o una integrante) y el de cada
 * integrante (SPEC 22).
 */
export async function WeekAgenda({
  professional,
  dia,
  staffId,
  basePath,
  extraQuery = "",
  bookingHref,
  staffNames,
  description,
  toolbar,
}: {
  professional: Professional;
  dia: string | undefined;
  /** `null` = todas las del negocio. */
  staffId: string | null;
  basePath: string;
  /** Parámetros que se conservan al cambiar de semana, p. ej. `&integrante=…`. */
  extraQuery?: string;
  bookingHref: (bookingId: string) => string;
  /** Si viene, cada bloque dice quién atiende. */
  staffNames?: Map<string, string>;
  description: string;
  toolbar?: ReactNode;
}) {
  const tz = professional.timezone;
  const today = localDateInZone(new Date(), tz);
  const selectedDay = isLocalDate(dia) ? dia : today;
  const monday = mondayOf(selectedDay);
  const days = weekDates(monday);

  const repository = new DrizzleBookingRepository();
  const from = zonedDateTimeToUtc(monday, "00:00", tz);
  const to = zonedDateTimeToUtc(addDays(monday, 7), "00:00", tz);
  const bookings = staffId
    ? await repository.listActiveByStaffInRange(staffId, from, to)
    : await repository.listActiveByProfessionalInRange(professional.id, from, to);

  const clientIds = Array.from(new Set(bookings.map((b) => b.clientUserId)));
  const variantIds = Array.from(new Set(bookings.map((b) => b.serviceVariantId)));
  const [clientRows, variantRows] = await Promise.all([
    clientIds.length
      ? db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, clientIds))
      : Promise.resolve([]),
    variantIds.length
      ? db
          .select({ id: serviceVariants.id, serviceName: services.name })
          .from(serviceVariants)
          .innerJoin(services, eq(serviceVariants.serviceId, services.id))
          .where(inArray(serviceVariants.id, variantIds))
      : Promise.resolve([]),
  ]);
  const clientName = new Map(clientRows.map((c) => [c.id, c.name]));
  const serviceName = new Map(variantRows.map((v) => [v.id, v.serviceName]));

  const blocks = bookings.map((booking) => {
    const start = utcToZonedMinutesOfDay(booking.startsAt, tz);
    return { booking, day: localDateInZone(booking.startsAt, tz), start, end: start + booking.durationMinutes };
  });
  const { startHour, endHour } = agendaHourRange(blocks);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridHeight = hours.length * HOUR_HEIGHT_PX;

  const formatTime = (minutes: number) =>
    `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const href = (day?: string) => {
    const query = [day ? `dia=${day}` : "", extraQuery.replace(/^&/, "")].filter(Boolean).join("&");
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Agenda"
        description={description}
        action={
          <div className="flex items-center gap-2">
            <BrandButton size="sm" variant="outline" href={href(addDays(selectedDay, -7))}>
              <ChevronLeft className="size-4" />
              <span className="sr-only">Semana anterior</span>
            </BrandButton>
            <BrandButton size="sm" variant="outline" href={href()}>
              Hoy
            </BrandButton>
            <BrandButton size="sm" variant="outline" href={href(addDays(selectedDay, 7))}>
              <ChevronRight className="size-4" />
              <span className="sr-only">Semana siguiente</span>
            </BrandButton>
          </div>
        }
      />

      {toolbar}

      {/* Teléfono: un día a la vez, elegido con estas pestañas. */}
      <nav aria-label="Día" className="grid grid-cols-7 gap-1 md:hidden">
        {days.map((day) => (
          <Link
            key={day}
            href={href(day)}
            aria-current={day === selectedDay ? "date" : undefined}
            className={cn(
              "flex flex-col items-center rounded-lg py-2 text-xs capitalize",
              day === selectedDay ? "bg-primary text-primary-foreground" : "bg-surface-1 text-foreground",
            )}
          >
            {dayLabel(day, "short")}
          </Link>
        ))}
      </nav>

      <Panel padding="sm" className="overflow-x-auto">
        <div className="grid grid-cols-[3rem_1fr] md:grid-cols-[3rem_repeat(7,minmax(6rem,1fr))]">
          <div />
          {days.map((day) => (
            <div
              key={day}
              className={cn(
                "border-b border-outline-variant pb-2 text-center text-sm capitalize",
                day === today ? "font-semibold text-primary" : "text-foreground",
                day === selectedDay ? "block" : "hidden md:block",
              )}
            >
              <span className="md:hidden">{dayLabel(day, "long")}</span>
              <span className="hidden md:inline">{dayLabel(day, "short")}</span>
            </div>
          ))}

          <div className="relative" style={{ height: gridHeight }}>
            {hours.map((hour, i) => (
              <span
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground"
                style={{ top: i * HOUR_HEIGHT_PX }}
              >
                {i === 0 ? "" : `${String(hour).padStart(2, "0")}:00`}
              </span>
            ))}
          </div>

          {days.map((day) => (
            <div
              key={day}
              className={cn(
                "relative border-l border-outline-variant",
                day === today && "bg-surface-1",
                day === selectedDay ? "block" : "hidden md:block",
              )}
              style={{ height: gridHeight }}
            >
              {hours.map((hour, i) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-outline-variant/60"
                  style={{ top: i * HOUR_HEIGHT_PX }}
                />
              ))}
              {blocks
                .filter((block) => block.day === day)
                .map(({ booking, start, end }) => {
                  const top = ((start - startHour * 60) / 60) * HOUR_HEIGHT_PX;
                  const height = Math.max(((end - start) / 60) * HOUR_HEIGHT_PX, 22);
                  const pending = booking.status === "pending";
                  const who = staffNames?.get(booking.staffId);
                  return (
                    <Link
                      key={booking.id}
                      href={bookingHref(booking.id)}
                      title={`${formatTime(start)}–${formatTime(end)} · ${serviceName.get(booking.serviceVariantId) ?? "Servicio"} · ${clientName.get(booking.clientUserId) ?? "Clienta"}${who ? ` · con ${who}` : ""}${pending ? " · pendiente" : ""}`}
                      className={cn(
                        "absolute inset-x-1 overflow-hidden rounded-md border-l-4 px-2 py-1 text-xs leading-tight",
                        pending
                          ? "border border-dashed border-primary bg-background text-foreground"
                          : "border-primary bg-surface-2 text-foreground",
                      )}
                      style={{ top, height }}
                    >
                      <span className="font-medium">{formatTime(start)}</span>{" "}
                      <span>{clientName.get(booking.clientUserId) ?? "Clienta"}</span>
                      {height >= 40 && (
                        <span className="block truncate text-muted-foreground">
                          {serviceName.get(booking.serviceVariantId) ?? "Servicio"}
                          {who ? ` · ${who}` : ""}
                        </span>
                      )}
                    </Link>
                  );
                })}
            </div>
          ))}
        </div>
      </Panel>

      {bookings.length === 0 && <Caption>No hay reservas activas esta semana.</Caption>}
    </div>
  );
}
