"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { getAdminNavItems } from "@/app/[slug]/admin/admin-nav-items";
import type { Vertical } from "@/server/domain/tenant/vertical";

export function AdminTopBar({
  slug,
  vertical,
  pendingBookingsCount = 0,
  pendingReviewsCount = 0,
  onOpen,
}: {
  slug: string;
  vertical: Vertical;
  pendingBookingsCount?: number;
  pendingReviewsCount?: number;
  onOpen: () => void;
}) {
  const pathname = usePathname();
  const items = getAdminNavItems(slug, vertical, { pendingBookingsCount, pendingReviewsCount });
  const current = items.find((item) => (item.exact ? pathname === item.href : (pathname?.startsWith(item.href) ?? false)));

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-outline-variant bg-background/85 px-4 py-3 backdrop-blur-md lg:hidden">
      <button
        type="button"
        aria-label="Abrir menú"
        onClick={onOpen}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-pill text-foreground hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none"
      >
        <Menu className="size-5" />
      </button>
      <span className="t-title">{current?.label ?? "Panel"}</span>
    </header>
  );
}
