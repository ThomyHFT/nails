import { requireProfessional } from "@/server/interface/guards";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireProfessional(slug);

  return (
    <div className="flex min-h-screen">
      <nav className="w-56 shrink-0 border-r px-4 py-6" />
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
