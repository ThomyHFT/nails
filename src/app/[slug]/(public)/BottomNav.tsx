"use client";

import { usePathname } from "next/navigation";
import { CalendarCheck, Home, Tag } from "lucide-react";
import { BottomNavBar } from "@/components/brand";

export function BottomNav({ slug }: { slug: string }) {
  const pathname = usePathname();

  const items = [
    { href: `/${slug}`, label: "Inicio", icon: <Home />, active: pathname === `/${slug}` },
    {
      href: `/${slug}/servicios`,
      label: "Servicios",
      icon: <Tag />,
      active: pathname?.startsWith(`/${slug}/servicios`) ?? false,
    },
    {
      href: `/${slug}/cuenta`,
      label: "Mis Reservas",
      icon: <CalendarCheck />,
      active: pathname?.startsWith(`/${slug}/cuenta`) ?? false,
    },
  ];

  return <BottomNavBar items={items} />;
}
