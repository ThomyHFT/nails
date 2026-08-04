import { inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { db } from "@/server/infrastructure/db/client";
import { users } from "@/server/infrastructure/db/schema/users";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { ListClientStatsUseCase } from "@/server/application/booking/list-client-stats.use-case";
import { AdminPageHeader, Caption, Chip, EmptyState, Overline, Panel, Price } from "@/components/brand";

function formatDate(date: Date) {
  return date.toLocaleDateString("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" });
}

export default async function ClientesAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  if (!professional) {
    notFound();
  }

  const stats = await new ListClientStatsUseCase(new DrizzleBookingRepository()).execute(professional.id);

  const clientIds = stats.map((s) => s.clientUserId);
  const clientRows = clientIds.length
    ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, clientIds))
    : [];
  const clientById = new Map(clientRows.map((c) => [c.id, c]));

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <AdminPageHeader
        title="Clientes"
        description="Quiénes te han reservado, cuánto han gastado y cuándo fue la última vez."
      />

      {stats.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title="Todavía no tienes clientes"
          description="Acá vas a ver a quienes te reserven, con su historial y sus strikes."
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="p-2">
                  <Overline>Cliente</Overline>
                </th>
                <th className="p-2">
                  <Overline>Reservas</Overline>
                </th>
                <th className="p-2">
                  <Overline>Gasto total</Overline>
                </th>
                <th className="p-2">
                  <Overline>Última visita</Overline>
                </th>
                <th className="p-2">
                  <Overline>Strikes</Overline>
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat) => {
                const client = clientById.get(stat.clientUserId);
                return (
                  <tr key={stat.clientUserId} className="border-b border-outline-variant last:border-0">
                    <td className="p-2">
                      <div className="font-medium">{client?.name ?? "Clienta"}</div>
                      {client?.email && <Caption className="text-xs">{client.email}</Caption>}
                    </td>
                    <td className="p-2 text-sm">
                      {stat.completedBookings} / {stat.totalBookings}
                    </td>
                    <td className="p-2">
                      <Price clp={stat.totalSpentClp} size="sm" />
                    </td>
                    <td className="p-2 text-sm text-muted-foreground">{formatDate(stat.lastBookingAt)}</td>
                    <td className="p-2">
                      {stat.strikes > 0 && (
                        <Chip tone="warning">
                          {stat.strikes} strike{stat.strikes > 1 ? "s" : ""}
                        </Chip>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
