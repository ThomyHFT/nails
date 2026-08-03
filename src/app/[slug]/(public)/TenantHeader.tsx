"use client";

import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/brand";

export function TenantHeader({
  slug,
  businessName,
  logoUrl,
}: {
  slug: string;
  businessName: string;
  logoUrl: string | null;
}) {
  const pathname = usePathname();
  const { status, data: session } = useSession();

  // La navegación de escritorio lleva a los mismos destinos que la barra
  // inferior de móvil: son una anatomía distinta del mismo mapa, no dos mapas.
  const items = [
    { href: `/${slug}`, label: "Inicio", active: pathname === `/${slug}` },
    { href: `/${slug}/servicios`, label: "Servicios", active: pathname?.startsWith(`/${slug}/servicios`) ?? false },
    { href: `/${slug}/opiniones`, label: "Opiniones", active: pathname?.startsWith(`/${slug}/opiniones`) ?? false },
  ];

  // La dueña del tenant también navega su propio micrositio público (para
  // ver cómo se ve, revisar reseñas, etc.); el ícono de cuenta tiene que
  // llevarla a su panel, no a /cuenta — esa pantalla es de clientas y ni
  // siquiera resuelve sus reservas.
  const accountHref =
    status === "authenticated"
      ? session?.user.role === "professional"
        ? `/${slug}/admin`
        : `/${slug}/cuenta`
      : `/${slug}/login`;

  const iconButtonClasses =
    "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none";

  // Cerrar sesión vive acá y no solo en /cuenta: ir al perfil primero para
  // salir era un paso extra innecesario en cualquier otra pantalla.
  const action = (
    <div className="flex items-center gap-1">
      <Link href={accountHref} aria-label="Mi cuenta" className={iconButtonClasses}>
        <User className="size-5" />
      </Link>
      {status === "authenticated" && (
        <button
          type="button"
          aria-label="Cerrar sesión"
          onClick={() => signOut({ callbackUrl: `/${slug}/login` })}
          className={iconButtonClasses}
        >
          <LogOut className="size-5" />
        </button>
      )}
    </div>
  );

  return (
    <AppHeader homeHref={`/${slug}`} businessName={businessName} logoUrl={logoUrl} items={items} action={action} />
  );
}
