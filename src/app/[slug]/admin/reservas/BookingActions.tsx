"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

async function postAction(bookingId: string, action: "confirm" | "complete" | "no-show") {
  return fetch(`/api/bookings/${bookingId}/${action}`, { method: "POST" });
}

export function BookingActions({ bookingId, status }: { bookingId: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function run(action: "confirm" | "complete" | "no-show") {
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await postAction(bookingId, action);
      if (!response.ok) {
        const data = await response.json();
        setError(typeof data.error === "string" ? data.error : "No se pudo actualizar la reserva.");
        return;
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status === "pending" && (
          <Button size="sm" disabled={isSubmitting} onClick={() => run("confirm")}>
            Confirmar
          </Button>
        )}
        {(status === "pending" || status === "confirmed") && (
          <>
            <Button size="sm" variant="outline" disabled={isSubmitting} onClick={() => run("complete")}>
              Completada
            </Button>
            <Button size="sm" variant="destructive" disabled={isSubmitting} onClick={() => run("no-show")}>
              No show
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
