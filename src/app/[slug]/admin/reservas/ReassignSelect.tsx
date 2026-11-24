"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Pasar la reserva a otra integrante libre a esa hora (SPEC 22). */
export function ReassignSelect({
  bookingId,
  currentStaffId,
  staff,
}: {
  bookingId: string;
  currentStaffId: string;
  staff: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reassign(staffId: string) {
    if (staffId === currentStaffId) return;
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "No se pudo reasignar.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Atiende
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          value={currentStaffId}
          disabled={busy}
          onChange={(e) => reassign(e.target.value)}
        >
          {staff.some((s) => s.id === currentStaffId) ? null : <option value={currentStaffId}>(inactiva)</option>}
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
