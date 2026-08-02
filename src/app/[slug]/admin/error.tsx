"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { ActionLink, BrandButton, EmptyState } from "@/components/brand";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ slug: string }>();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-16">
      <EmptyState
        icon={<TriangleAlert />}
        title="Ocurrió un error al cargar esta sección"
        description="Puedes reintentar o volver al inicio del panel."
        action={
          <div className="flex flex-wrap items-center justify-center gap-4">
            <BrandButton onClick={reset}>Reintentar</BrandButton>
            <ActionLink href={`/${params.slug}/admin`}>Volver al panel</ActionLink>
          </div>
        }
        className="max-w-md"
      />
    </div>
  );
}
