"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandButton } from "@/components/brand";

/** Salir de la lista de espera de un día (SPEC 21). */
export function LeaveWaitlistButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);

  async function leave() {
    setIsLeaving(true);
    try {
      await fetch(`/api/waitlist/${entryId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setIsLeaving(false);
    }
  }

  return (
    <BrandButton size="sm" variant="ghost" disabled={isLeaving} onClick={leave}>
      {isLeaving ? "Saliendo…" : "Salir"}
    </BrandButton>
  );
}
