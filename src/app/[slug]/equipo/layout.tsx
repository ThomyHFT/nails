import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSessionStaff } from "@/server/interface/staff-context";
import { StaffSignOut } from "@/app/[slug]/equipo/StaffSignOut";

/**
 * Panel de la integrante (SPEC 22): su agenda, sus reservas y su cuenta. El
 * middleware solo cubre /admin, así que el corte vive acá: sin sesión de
 * integrante activa de este negocio, no hay panel.
 */
export default async function EquipoLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) redirect(`/${slug}/login?next=${encodeURIComponent(`/${slug}/equipo`)}`);

  const staffSession = await getSessionStaff();
  if (!staffSession || staffSession.professional.slug !== slug) notFound();

  const base = `/${slug}/equipo`;
  const items = [
    { href: base, label: "Agenda" },
    { href: `${base}/reservas`, label: "Reservas" },
    { href: `${base}/cuenta`, label: "Mi cuenta" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-6 py-4">
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">{staffSession.professional.businessName}</span>
          <span className="font-medium">{staffSession.staff.name}</span>
        </div>
        <nav aria-label="Panel de equipo" className="flex flex-wrap items-center gap-4 text-sm">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="font-medium text-foreground underline-offset-4 hover:underline">
              {item.label}
            </Link>
          ))}
          <StaffSignOut slug={slug} />
        </nav>
      </header>
      <main className="flex min-w-0 flex-1 flex-col gap-6 px-6 py-8 lg:px-10">{children}</main>
    </div>
  );
}
