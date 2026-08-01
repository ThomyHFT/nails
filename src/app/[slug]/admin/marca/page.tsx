import { MarcaForm } from "@/app/[slug]/admin/marca/MarcaForm";
import { AdminPageHeader } from "@/components/brand";

export default async function MarcaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Marca"
        description="Elige el arquetipo, los colores y la tipografía de tu micrositio."
      />
      <MarcaForm slug={slug} />
    </div>
  );
}
