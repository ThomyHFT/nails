import { notFound } from "next/navigation";
import { getSessionStaff } from "@/server/interface/staff-context";
import { WeekAgenda } from "@/app/[slug]/_agenda/WeekAgenda";

/** La agenda de la integrante (SPEC 22): solo sus horas. */
export default async function StaffAgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ dia?: string }>;
}) {
  const { slug } = await params;
  const { dia } = await searchParams;
  const staffSession = await getSessionStaff();
  if (!staffSession) notFound();

  return (
    <WeekAgenda
      professional={staffSession.professional}
      dia={dia}
      staffId={staffSession.staff.id}
      basePath={`/${slug}/equipo`}
      bookingHref={(id) => `/${slug}/equipo/reservas#${id}`}
      description="Tus horas de la semana. Las pendientes van con borde punteado."
    />
  );
}
