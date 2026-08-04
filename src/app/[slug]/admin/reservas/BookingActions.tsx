"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandButton } from "@/components/brand";

type Action = "confirm" | "complete" | "no-show" | "reject";

async function postAction(bookingId: string, action: Action) {
  return fetch(`/api/bookings/${bookingId}/${action}`, { method: "POST" });
}

export function BookingActions({ bookingId, status }: { bookingId: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);

  async function run(action: Action) {
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await postAction(bookingId, action);
      if (!response.ok) {
        const data = await response.json();
        setError(typeof data.error === "string" ? data.error : "No se pudo actualizar la reserva.");
        return;
      }
      setConfirmingReject(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        {status === "pending" && (
          <BrandButton size="sm" disabled={isSubmitting} onClick={() => run("confirm")}>
            Confirmar
          </BrandButton>
        )}
        {(status === "pending" || status === "confirmed") && (
          <>
            <BrandButton size="sm" variant="outline" disabled={isSubmitting} onClick={() => run("complete")}>
              Completada
            </BrandButton>
            <BrandButton size="sm" variant="danger" disabled={isSubmitting} onClick={() => run("no-show")}>
              No show
            </BrandButton>
            {confirmingReject ? (
              <>
                <BrandButton size="sm" variant="danger" disabled={isSubmitting} onClick={() => run("reject")}>
                  Sí, {status === "pending" ? "rechazar" : "cancelar"}
                </BrandButton>
                <BrandButton size="sm" variant="ghost" disabled={isSubmitting} onClick={() => setConfirmingReject(false)}>
                  No
                </BrandButton>
              </>
            ) : (
              <BrandButton size="sm" variant="ghost" disabled={isSubmitting} onClick={() => setConfirmingReject(true)}>
                {status === "pending" ? "Rechazar" : "Cancelar"}
              </BrandButton>
            )}
          </>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
