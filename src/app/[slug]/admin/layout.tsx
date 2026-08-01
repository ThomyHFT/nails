import { requireTenantOwner } from "@/server/interface/guards";
import { ListReviewsUseCase } from "@/server/application/review/list-reviews.use-case";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleReviewsRepository } from "@/server/infrastructure/repositories/drizzle-reviews.repository";
import { AdminSidebar } from "@/app/[slug]/admin/AdminSidebar";

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

  return (
    <div className="flex min-h-screen">
      <AdminSidebar slug={slug} pendingReviewsCount={pendingReviewsCount} />
      <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
    </div>
  );
}
