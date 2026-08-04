"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Vertical } from "@/server/domain/tenant/vertical";
import { AdminTopBar } from "@/app/[slug]/admin/AdminTopBar";
import { AdminSidebar } from "@/app/[slug]/admin/AdminSidebar";

export function AdminNav({
  slug,
  vertical,
  pendingReviewsCount = 0,
}: {
  slug: string;
  vertical: Vertical;
  pendingReviewsCount?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsOpen(false);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <AdminTopBar slug={slug} vertical={vertical} pendingReviewsCount={pendingReviewsCount} onOpen={() => setIsOpen(true)} />
      <AdminSidebar
        slug={slug}
        vertical={vertical}
        pendingReviewsCount={pendingReviewsCount}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
