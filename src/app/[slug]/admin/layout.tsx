import { requireTenantOwner } from "@/server/interface/guards";
import { ListReviewsUseCase } from "@/server/application/review/list-reviews.use-case";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleReviewsRepository } from "@/server/infrastructure/repositories/drizzle-reviews.repository";
import { AdminNav } from "@/app/[slug]/admin/AdminNav";
import { AccountBanners } from "@/app/[slug]/admin/AccountBanners";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireTenantOwner(slug);

  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  const pendingReviewsCount = professional
    ? await new ListReviewsUseCase(new DrizzleReviewsRepository()).countPending(professional.id)
    : 0;

  const now = new Date();
  const daysUntilTrialEnds = professional?.trialEndsAt
    ? Math.ceil((professional.trialEndsAt.getTime() - now.getTime()) / DAY_MS)
    : null;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminNav slug={slug} pendingReviewsCount={pendingReviewsCount} />
      <main className="flex min-w-0 flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
        {professional && (
          <AccountBanners isPublished={professional.publishedAt !== null} daysUntilTrialEnds={daysUntilTrialEnds} />
        )}
        {children}
      </main>
    </div>
  );
}
