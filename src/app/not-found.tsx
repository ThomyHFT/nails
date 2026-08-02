import { SearchX } from "lucide-react";
import { ActionLink, EmptyState } from "@/components/brand";

export default function TenantNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-16">
      <EmptyState
        icon={<SearchX />}
        title="No encontramos este negocio"
        description="El link puede estar mal escrito o el micrositio ya no existe."
        action={<ActionLink href="/">Volver al inicio</ActionLink>}
        className="max-w-md"
      />
    </div>
  );
}
