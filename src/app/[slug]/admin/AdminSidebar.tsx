"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, LayoutDashboard, Palette, Sparkles, Tag } from "lucide-react";

export function AdminSidebar({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/${slug}/admin`;

  const items = [
    { href: base, label: "Resumen", icon: LayoutDashboard, exact: true },
    { href: `${base}/reservas`, label: "Reservas", icon: CalendarClock, exact: false },
    { href: `${base}/disponibilidad`, label: "Disponibilidad", icon: CalendarClock, exact: false },
    { href: `${base}/servicios`, label: "Servicios", icon: Tag, exact: false },
    { href: `${base}/diseno`, label: "Catálogo de diseño", icon: Sparkles, exact: false },
    { href: `${base}/marca`, label: "Marca", icon: Palette, exact: false },
  ];

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-border px-3 py-6">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors"
            style={{
              borderRadius: "var(--radius)",
              background: active ? "var(--primary)" : "transparent",
              color: active ? "var(--primary-foreground)" : "var(--foreground)",
            }}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
