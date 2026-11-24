import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarClock,
  CalendarRange,
  Gift,
  Images,
  LayoutDashboard,
  Palette,
  QrCode,
  Sparkles,
  Star,
  Tag,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import { verticalModules, type Vertical } from "@/server/domain/tenant/vertical";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  exact: boolean;
  badge?: number;
};

export interface AdminNavCounts {
  pendingBookingsCount?: number;
  pendingReviewsCount?: number;
  /** Plan Salón (SPEC 22): muestra "Equipo". */
  hasTeam?: boolean;
}

export function getAdminNavItems(
  slug: string,
  vertical: Vertical,
  { pendingBookingsCount = 0, pendingReviewsCount = 0, hasTeam = false }: AdminNavCounts = {},
): AdminNavItem[] {
  const base = `/${slug}/admin`;

  return [
    { href: base, label: "Resumen", icon: <LayoutDashboard />, exact: true },
    { href: `${base}/agenda`, label: "Agenda", icon: <CalendarRange />, exact: false },
    {
      href: `${base}/reservas`,
      label: "Reservas",
      icon: <CalendarClock />,
      exact: false,
      badge: pendingBookingsCount > 0 ? pendingBookingsCount : undefined,
    },
    { href: `${base}/clientes`, label: "Clientes", icon: <Users />, exact: false },
    ...(hasTeam ? [{ href: `${base}/equipo`, label: "Equipo", icon: <UsersRound />, exact: false }] : []),
    { href: `${base}/reportes`, label: "Reportes", icon: <BarChart3 />, exact: false },
    { href: `${base}/disponibilidad`, label: "Disponibilidad", icon: <CalendarClock />, exact: false },
    { href: `${base}/servicios`, label: "Servicios", icon: <Tag />, exact: false },
    { href: `${base}/paquetes`, label: "Paquetes y gift cards", icon: <Gift />, exact: false },
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
    { href: `${base}/compartir`, label: "Compartir", icon: <QrCode />, exact: false },
    { href: `${base}/cuenta`, label: "Mi cuenta", icon: <UserRound />, exact: false },
  ];
}
