import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/brand";

export default function VerificarInvalidoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-16">
      <EmptyState
        icon={<TriangleAlert />}
        title="Este enlace ya no es válido"
        description="Puede haber vencido o ya haberse usado. Inicia sesión en tu panel y pide un enlace nuevo desde ahí."
        className="max-w-md"
      />
    </div>
  );
}
