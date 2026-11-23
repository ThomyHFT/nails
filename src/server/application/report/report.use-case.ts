import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { BookingStatus } from "@/server/domain/booking/booking.entity";
import type { Professional } from "@/server/domain/professional/professional.entity";
import { toCsv } from "@/server/domain/report/csv";
import { buildMonthlyReport, type MonthlyReport } from "@/server/domain/report/monthly-report";
import type { ServicesRepository } from "@/server/domain/service/services-repository.port";
import { isPlaceholderEmail } from "@/server/domain/user/client-contact";
import type { UserRepository } from "@/server/domain/user/user-repository.port";

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

async function variantLabels(services: ServicesRepository, professionalId: string) {
  const list = await services.listByProfessional(professionalId);
  return new Map(
    list.flatMap((service) => service.variants.map((v) => [v.id, { service: service.name, variant: v.label }] as const)),
  );
}

/** Exportar e informar sobre las reservas de una profesional (SPEC 20). */
export class ReportUseCase {
  constructor(
    private readonly bookings: BookingRepository,
    private readonly users: UserRepository,
    private readonly services: ServicesRepository,
  ) {}

  async bookingsCsv(professional: Professional): Promise<string> {
    const [bookings, labels] = await Promise.all([
      this.bookings.listByProfessional(professional.id),
      variantLabels(this.services, professional.id),
    ]);
    const clients = new Map(
      (await this.users.findManyByIds([...new Set(bookings.map((b) => b.clientUserId))])).map((u) => [u.id, u]),
    );
    const tz = professional.timezone;
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
    const time = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

    const rows = [...bookings]
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .map((b) => {
        const client = clients.get(b.clientUserId);
        const label = labels.get(b.serviceVariantId);
        return [
          date.format(b.startsAt),
          time.format(b.startsAt),
          STATUS_LABEL[b.status],
          label?.service ?? "Servicio",
          label?.variant ?? "",
          b.durationMinutes,
          b.priceClp,
          client?.name ?? "",
          client?.phone ?? "",
          client && !isPlaceholderEmail(client.email) ? client.email : "",
          b.clientNote ?? "",
          b.cancelledBy === "client" ? "Clienta" : b.cancelledBy === "professional" ? "Profesional" : "",
        ];
      });
    return toCsv(
      ["Fecha", "Hora", "Estado", "Servicio", "Variante", "Duración (min)", "Precio (CLP)", "Clienta", "Teléfono", "Correo", "Nota de la clienta", "Cancelada por"],
      rows,
    );
  }

  async clientsCsv(professional: Professional): Promise<string> {
    const stats = await this.bookings.listClientStats(professional.id);
    const clients = new Map((await this.users.findManyByIds(stats.map((s) => s.clientUserId))).map((u) => [u.id, u]));
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: professional.timezone, year: "numeric", month: "2-digit", day: "2-digit" });
    return toCsv(
      ["Nombre", "Teléfono", "Correo", "Reservas", "Completadas", "Gasto total (CLP)", "Última reserva", "Cancelaciones suyas"],
      stats.map((s) => {
        const client = clients.get(s.clientUserId);
        return [
          client?.name ?? "",
          client?.phone ?? "",
          client && !isPlaceholderEmail(client.email) ? client.email : "",
          s.totalBookings,
          s.completedBookings,
          s.totalSpentClp,
          date.format(s.lastBookingAt),
          s.strikes,
        ];
      }),
    );
  }

  async monthly(professional: Professional, month: string): Promise<MonthlyReport> {
    const [bookings, labels] = await Promise.all([
      this.bookings.listByProfessional(professional.id),
      variantLabels(this.services, professional.id),
    ]);
    return buildMonthlyReport({
      bookings,
      month,
      timezone: professional.timezone,
      serviceNameByVariant: new Map([...labels].map(([id, l]) => [id, l.service])),
    });
  }
}
