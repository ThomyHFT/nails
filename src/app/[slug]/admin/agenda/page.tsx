import { notFound } from "next/navigation";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleStaffRepository } from "@/server/infrastructure/repositories/drizzle-staff.repository";
import { WeekAgenda } from "@/app/[slug]/_agenda/WeekAgenda";

/** Agenda de la dueña (SPEC 19): todo el negocio o, con equipo, una integrante (SPEC 22). */
export default async function AgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ dia?: string; integrante?: string }>;
}) {
  const { slug } = await params;
  const { dia, integrante } = await searchParams;

  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  if (!professional) notFound();

  const team = professional.plan === "salon" ? await new DrizzleStaffRepository().listByProfessional(professional.id) : [];
  const hasTeam = team.length > 1;
  const staffNames = new Map(team.map((s) => [s.id, s.name]));
  const filterStaff = hasTeam && integrante && staffNames.has(integrante) ? integrante : null;
  const base = `/${slug}/admin/agenda`;
  const pill =
    "rounded-pill border border-outline-variant px-3 py-1 text-sm aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground";

  return (
    <WeekAgenda
      professional={professional}
      dia={dia}
      staffId={filterStaff}
      basePath={base}
      extraQuery={filterStaff ? `&integrante=${filterStaff}` : ""}
      bookingHref={(id) => `/${slug}/admin/reservas#${id}`}
      staffNames={hasTeam && !filterStaff ? staffNames : undefined}
      description="Tu semana de un vistazo. Las pendientes van con borde punteado; confírmalas o muévelas desde Reservas."
      toolbar={
        hasTeam ? (
          <nav aria-label="Filtrar por integrante" className="flex flex-wrap gap-2">
            <a href={base} aria-current={filterStaff ? undefined : "page"} className={pill}>
              Todas
            </a>
            {team.map((member) => (
              <a
                key={member.id}
                href={`${base}?integrante=${member.id}`}
                aria-current={filterStaff === member.id ? "page" : undefined}
                className={pill}
              >
                {member.name}
              </a>
            ))}
          </nav>
        ) : null
      }
    />
  );
}
