"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { SidebarItem } from "@/components/brand";
import { cn } from "@/lib/utils";
import { getAdminNavItems } from "@/app/[slug]/admin/admin-nav-items";
import type { Vertical } from "@/server/domain/tenant/vertical";

export function AdminSidebar({
  slug,
  vertical,
  pendingBookingsCount = 0,
  pendingReviewsCount = 0,
  open = false,
  onClose,
}: {
  slug: string;
  vertical: Vertical;
  pendingBookingsCount?: number;
  pendingReviewsCount?: number;
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const items = getAdminNavItems(slug, vertical, { pendingBookingsCount, pendingReviewsCount });

  const nav = (
    <nav className="flex h-full w-60 shrink-0 flex-col gap-1 px-3 py-6">
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
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: `/${slug}/login` })}
          className="flex w-full items-center gap-3 rounded-pill px-4 py-2.5 text-sm font-medium text-destructive outline-none transition-colors duration-200 hover:bg-destructive-tint focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&_svg]:size-5"
        >
          <LogOut />
          <span className="flex-1 text-left">Cerrar sesión</span>
        </button>
      </div>
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 hidden h-screen shrink-0 self-start border-r border-outline-variant bg-surface-1 lg:block">
        {nav}
      </div>

      <div className="lg:hidden">
        {open && (
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={onClose}
            className="fixed inset-0 z-40 bg-foreground/40"
          />
        )}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 border-r border-outline-variant bg-surface-1 shadow-e2 transition-transform duration-200 [transition-timing-function:var(--ease-brand)]",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {nav}
        </div>
      </div>
    </>
  );
}
