import { requireAdmin } from "@/server/interface/guards";
import { ListProfessionalsUseCase } from "@/server/application/admin/list-professionals.use-case";
import { ListInviteCodesUseCase } from "@/server/application/admin/list-invite-codes.use-case";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleInviteCodesRepository } from "@/server/infrastructure/repositories/drizzle-invite-codes.repository";
import { AdminPageHeader } from "@/components/brand";
import { AdminDashboard } from "@/app/admin/admin-dashboard";

export default async function SuperadminPage() {
  await requireAdmin();

  const [professionals, inviteCodes] = await Promise.all([
    new ListProfessionalsUseCase(new DrizzleProfessionalRepository()).execute(),
    new ListInviteCodesUseCase(new DrizzleInviteCodesRepository()).execute(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-10">
      <AdminPageHeader title="Panel de administración" description="Profesionales y códigos de invitación." />
      <AdminDashboard
        initialProfessionals={professionals.map((p) => ({
          id: p.id,
          slug: p.slug,
          businessName: p.businessName,
          vertical: p.vertical,
          active: p.active,
          publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
          trialEndsAt: p.trialEndsAt ? p.trialEndsAt.toISOString() : null,
          createdAt: p.createdAt.toISOString(),
        }))}
        initialInviteCodes={inviteCodes.map((c) => ({
          id: c.id,
          code: c.code,
          note: c.note,
          usedByProfessionalId: c.usedByProfessionalId,
          usedAt: c.usedAt ? c.usedAt.toISOString() : null,
          expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
          createdAt: c.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
