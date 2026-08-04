import type { ReactNode } from "react";
import { CalendarClock, Images, LayoutDashboard, Palette, Sparkles, Star, Tag, Users } from "lucide-react";
import { verticalModules, type Vertical } from "@/server/domain/tenant/vertical";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  exact: boolean;
  badge?: number;
};

export function getAdminNavItems(slug: string, vertical: Vertical, pendingReviewsCount = 0): AdminNavItem[] {
  const base = `/${slug}/admin`;

  return [
    { href: base, label: "Resumen", icon: <LayoutDashboard />, exact: true },
    { href: `${base}/reservas`, label: "Reservas", icon: <CalendarClock />, exact: false },
    { href: `${base}/clientes`, label: "Clientes", icon: <Users />, exact: false },
    { href: `${base}/disponibilidad`, label: "Disponibilidad", icon: <CalendarClock />, exact: false },
    { href: `${base}/servicios`, label: "Servicios", icon: <Tag />, exact: false },
    // Esconder el link no alcanza como protección — la ruta /admin/diseno
    // también corta con notFound() para estos rubros (ver SPEC 13).
    ...(verticalModules(vertical).designer
      ? [{ href: `${base}/diseno`, label: "Catálogo de diseño", icon: <Sparkles />, exact: false }]
      : []),
    { href: `${base}/portafolio`, label: "Portafolio", icon: <Images />, exact: false },
    {
      href: `${base}/opiniones`,
      label: "Opiniones",
      icon: <Star />,
      exact: false,
      badge: pendingReviewsCount > 0 ? pendingReviewsCount : undefined,
    },
    { href: `${base}/marca`, label: "Marca", icon: <Palette />, exact: false },
  ];
}
