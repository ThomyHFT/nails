"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

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
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-16 text-center">
      <p className="text-sm font-medium text-foreground">Ocurrió un error al cargar esta sección.</p>
      <p className="text-sm text-muted-foreground">Puedes reintentar o volver al inicio del panel.</p>
      <div className="mt-2 flex gap-3">
        <Button variant="outline" onClick={reset}>
          Reintentar
        </Button>
        <Link href={`/${params.slug}/admin`} className={buttonVariants({ variant: "default" })}>
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
