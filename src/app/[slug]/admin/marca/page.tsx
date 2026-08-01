import { MarcaForm } from "@/app/[slug]/admin/marca/MarcaForm";

export default function MarcaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Marca</h1>
        <p className="text-sm text-muted-foreground">
          Elige el arquetipo, los colores y la tipografía de tu micrositio.
        </p>
      </div>
      <MarcaForm />
    </div>
  );
}
