import { notFound } from "next/navigation";
import { AdminPageHeader, BrandButton, Caption, Chip, Panel, Title } from "@/components/brand";
import { ListServicesUseCase } from "@/server/application/service/list-services.use-case";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import { DrizzleStaffRepository } from "@/server/infrastructure/repositories/drizzle-staff.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { AddStaffForm, StaffControls } from "@/app/[slug]/admin/equipo/TeamForms";

/** Equipo del salón (SPEC 22). Solo con plan Salón. */
export default async function EquipoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  if (!professional || professional.plan !== "salon") notFound();

  const [team, services] = await Promise.all([
    new DrizzleStaffRepository().listByProfessional(professional.id),
    new ListServicesUseCase(new DrizzleServicesRepository()).execute(professional.id),
  ]);
  const users = await new DrizzleUserRepository().findManyByIds(team.map((s) => s.userId).filter((id): id is string => !!id));
  const emailByUser = new Map(users.map((u) => [u.id, u.email]));
  const activeCount = team.filter((s) => s.active).length;
  const serviceOptions = services.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <AdminPageHeader
        title="Equipo"
        description={`${activeCount} de ${professional.staffLimit} integrantes activas. Cada una tiene su horario y su agenda.`}
      />

      <Panel className="flex flex-col gap-3">
        <Title>Agregar integrante</Title>
        <Caption>
          Con correo, entra en tu sitio con un código y ve solo su agenda y sus reservas. Sin correo, la manejas tú.
        </Caption>
        <AddStaffForm disabled={activeCount >= professional.staffLimit} />
        {activeCount >= professional.staffLimit && (
          <Caption>Llegaste al tope de tu plan. Desactiva a alguien o pide un plan más grande.</Caption>
        )}
      </Panel>

      <div className="flex flex-col gap-4">
        {team.map((member) => (
          <Panel key={member.id} padding="sm" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <Title>{member.name}</Title>
                <Caption className="text-xs">
                  {member.isOwner
                    ? "Dueña"
                    : member.userId
                      ? `Acceso: ${emailByUser.get(member.userId) ?? "con correo"}`
                      : "Sin acceso propio"}
                </Caption>
              </div>
              <div className="flex items-center gap-2">
                <Chip tone={member.active ? "success" : "neutral"}>{member.active ? "Activa" : "Inactiva"}</Chip>
                <BrandButton size="sm" variant="outline" href={`/${slug}/admin/disponibilidad?integrante=${member.id}`}>
                  Horario
                </BrandButton>
              </div>
            </div>
            <StaffControls
              staff={{
                id: member.id,
                name: member.name,
                isOwner: member.isOwner,
                active: member.active,
                hasAccess: member.userId !== null,
                allServices: member.allServices,
                serviceIds: member.serviceIds,
              }}
              services={serviceOptions}
            />
          </Panel>
        ))}
      </div>
    </div>
  );
}
