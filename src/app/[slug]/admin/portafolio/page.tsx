import { PortafolioManager } from "@/app/[slug]/admin/portafolio/PortafolioManager";
import { AdminPageHeader } from "@/components/brand";

export default async function PortafolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Portafolio"
        description="Sube fotos de tus trabajos y publica las que quieras mostrar."
      />
      <PortafolioManager slug={slug} />
    </div>
  );
}
