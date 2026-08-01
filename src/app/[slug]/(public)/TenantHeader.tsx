"use client";

import { usePathname } from "next/navigation";
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

  // La navegación de escritorio lleva a los mismos destinos que la barra
  // inferior de móvil: son una anatomía distinta del mismo mapa, no dos mapas.
  const items = [
    { href: `/${slug}`, label: "Inicio", active: pathname === `/${slug}` },
    { href: `/${slug}/servicios`, label: "Servicios", active: pathname?.startsWith(`/${slug}/servicios`) ?? false },
    { href: `/${slug}/opiniones`, label: "Opiniones", active: pathname?.startsWith(`/${slug}/opiniones`) ?? false },
  ];

  return <AppHeader homeHref={`/${slug}`} businessName={businessName} logoUrl={logoUrl} items={items} />;
}
