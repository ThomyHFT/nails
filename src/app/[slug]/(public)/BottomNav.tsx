"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { CalendarCheck, Home, LayoutDashboard, Tag, User } from "lucide-react";
import { BottomNavBar } from "@/components/brand";

export function BottomNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const { status, data: session } = useSession();

  // La profesional también navega su micrositio desde el celular: sin este
  // ítem, el único camino a /admin era el ícono chico del header de
  // escritorio, que en mobile queda casi invisible.
  const isProfessional = status === "authenticated" && session?.user.role === "professional";
  const accountItem = isProfessional
    ? {
        href: `/${slug}/admin`,
        label: "Mi panel",
        icon: <LayoutDashboard />,
        active: pathname?.startsWith(`/${slug}/admin`) ?? false,
      }
    : {
        href: status === "authenticated" ? `/${slug}/cuenta` : `/${slug}/login`,
        label: status === "authenticated" ? "Mis Reservas" : "Ingresar",
        icon: status === "authenticated" ? <CalendarCheck /> : <User />,
        active:
          (pathname?.startsWith(`/${slug}/cuenta`) ?? false) || (pathname?.startsWith(`/${slug}/login`) ?? false),
      };

  const items = [
    { href: `/${slug}`, label: "Inicio", icon: <Home />, active: pathname === `/${slug}` },
    {
      href: `/${slug}/servicios`,
      label: "Servicios",
      icon: <Tag />,
      active: pathname?.startsWith(`/${slug}/servicios`) ?? false,
    },
    accountItem,
  ];

  return <BottomNavBar items={items} />;
}
