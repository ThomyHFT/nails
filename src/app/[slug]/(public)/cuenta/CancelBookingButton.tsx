"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandButton } from "@/components/brand";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json();
        setError(typeof data.error === "string" ? data.error : "No se pudo cancelar la reserva.");
        return;
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <BrandButton size="sm" variant="danger" disabled={isSubmitting} onClick={handleCancel}>
        {isSubmitting ? "Cancelando…" : "Cancelar"}
      </BrandButton>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
