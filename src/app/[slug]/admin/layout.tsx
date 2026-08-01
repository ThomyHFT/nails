import { requireTenantOwner } from "@/server/interface/guards";
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

  return (
    <div className="flex min-h-screen">
      <AdminSidebar slug={slug} />
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
