import { PortafolioManager } from "@/app/[slug]/admin/portafolio/PortafolioManager";

export default async function PortafolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--tenant-font-heading)" }}>
          Portafolio
        </h1>
        <p className="text-sm text-muted-foreground">Sube fotos de tus trabajos y publica las que quieras mostrar.</p>
      </div>
      <PortafolioManager slug={slug} />
    </div>
  );
}
