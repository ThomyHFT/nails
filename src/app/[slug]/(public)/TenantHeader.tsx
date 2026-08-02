"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { User } from "lucide-react";
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
  const { status } = useSession();

  // La navegación de escritorio lleva a los mismos destinos que la barra
  // inferior de móvil: son una anatomía distinta del mismo mapa, no dos mapas.
  const items = [
    { href: `/${slug}`, label: "Inicio", active: pathname === `/${slug}` },
    { href: `/${slug}/servicios`, label: "Servicios", active: pathname?.startsWith(`/${slug}/servicios`) ?? false },
    { href: `/${slug}/opiniones`, label: "Opiniones", active: pathname?.startsWith(`/${slug}/opiniones`) ?? false },
  ];

  const accountHref = status === "authenticated" ? `/${slug}/cuenta` : `/${slug}/login`;

  const action = (
    <Link
      href={accountHref}
      aria-label="Mi cuenta"
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none"
    >
      <User className="size-5" />
    </Link>
  );

  return (
    <AppHeader homeHref={`/${slug}`} businessName={businessName} logoUrl={logoUrl} items={items} action={action} />
  );
}
