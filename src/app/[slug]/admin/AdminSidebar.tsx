"use client";

import { usePathname } from "next/navigation";
import { CalendarClock, Images, LayoutDashboard, Palette, Sparkles, Star, Tag } from "lucide-react";
import { SidebarItem } from "@/components/brand";

export function AdminSidebar({ slug, pendingReviewsCount = 0 }: { slug: string; pendingReviewsCount?: number }) {
  const pathname = usePathname();
  const base = `/${slug}/admin`;

  const items = [
    { href: base, label: "Resumen", icon: <LayoutDashboard />, exact: true, badge: undefined },
    { href: `${base}/reservas`, label: "Reservas", icon: <CalendarClock />, exact: false, badge: undefined },
    {
      href: `${base}/disponibilidad`,
      label: "Disponibilidad",
      icon: <CalendarClock />,
      exact: false,
      badge: undefined,
    },
    { href: `${base}/servicios`, label: "Servicios", icon: <Tag />, exact: false, badge: undefined },
    { href: `${base}/diseno`, label: "Catálogo de diseño", icon: <Sparkles />, exact: false, badge: undefined },
    { href: `${base}/portafolio`, label: "Portafolio", icon: <Images />, exact: false, badge: undefined },
    {
      href: `${base}/opiniones`,
      label: "Opiniones",
      icon: <Star />,
      exact: false,
      badge: pendingReviewsCount > 0 ? pendingReviewsCount : undefined,
    },
    { href: `${base}/marca`, label: "Marca", icon: <Palette />, exact: false, badge: undefined },
  ];

  return (
    <nav className="flex w-60 shrink-0 flex-col gap-1 border-r border-outline-variant bg-surface-1 px-3 py-6">
      {items.map((item) => (
        <SidebarItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.label}
          badge={item.badge}
          active={item.exact ? pathname === item.href : (pathname?.startsWith(item.href) ?? false)}
        />
      ))}
    </nav>
  );
}
