"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandButton, FIELD_CLASSES } from "@/components/brand";

type Action = "confirm" | "complete" | "no-show" | "reject";

async function postAction(bookingId: string, action: Action) {
  return fetch(`/api/bookings/${bookingId}/${action}`, { method: "POST" });
}

export function BookingActions({ bookingId, status }: { bookingId: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [moving, setMoving] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  // La profesional mueve libre: cualquier hora que no choque con otra reserva.
  async function reschedule() {
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, time: newTime }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "No se pudo reagendar la reserva.");
        return;
      }
      setMoving(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

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
            <BrandButton size="sm" variant="outline" disabled={isSubmitting} onClick={() => setMoving((v) => !v)}>
              Reagendar
            </BrandButton>
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
      {moving && (
        <div className="flex flex-wrap items-end justify-end gap-2 pt-2">
          <input
            type="date"
            aria-label="Nuevo día"
            className={`${FIELD_CLASSES} h-9 w-auto`}
            value={newDate}
            onChange={(event) => setNewDate(event.target.value)}
          />
          <input
            type="time"
            aria-label="Nueva hora"
            step={300}
            className={`${FIELD_CLASSES} h-9 w-auto`}
            value={newTime}
            onChange={(event) => setNewTime(event.target.value)}
          />
          <BrandButton size="sm" disabled={isSubmitting || !newDate || !newTime} onClick={reschedule}>
            Mover
          </BrandButton>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
