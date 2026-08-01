"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { CalendarCheck, Home, Tag } from "lucide-react";

export function BottomNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const isHome = pathname === `/${slug}`;
  const isServicios = pathname?.startsWith(`/${slug}/servicios`) ?? false;
  const isAccount = pathname?.startsWith(`/${slug}/cuenta`) ?? false;

  const items = [
    { href: `/${slug}`, label: "Inicio", icon: Home, active: isHome },
    { href: `/${slug}/servicios`, label: "Servicios", icon: Tag, active: isServicios },
    { href: `/${slug}/cuenta`, label: "Mis Reservas", icon: CalendarCheck, active: isAccount },
  ];

  return (
    <nav className="sticky bottom-0 z-10 flex border-t border-border bg-background/95 backdrop-blur">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors"
            style={{ color: item.active ? "var(--primary)" : "var(--muted-foreground)" }}
          >
            <Icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
