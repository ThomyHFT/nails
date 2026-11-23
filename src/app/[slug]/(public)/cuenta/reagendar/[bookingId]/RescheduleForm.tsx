"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandButton, Caption, FIELD_CLASSES, SelectChip } from "@/components/brand";

interface Slot {
  startsAt: string;
  endsAt: string;
}

function localTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(
    new Date(iso),
  );
}

function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function RescheduleForm({ slug, bookingId, timezone }: { slug: string; bookingId: string; timezone: string }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setLoading(true);
    setTime(null);
    setError(null);
    fetch(`/api/bookings/${bookingId}/reschedule?date=${date}`)
      .then(async (response) => {
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(typeof data.error === "string" ? data.error : "No se pudieron cargar los horarios.");
          setSlots([]);
          return;
        }
        setSlots(data.slots as Slot[]);
      })
      .catch(() => !cancelled && setError("No se pudieron cargar los horarios."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [date, bookingId]);

  async function submit() {
    if (!date || !time) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "No se pudo reagendar.");
        return;
      }
      router.push(`/${slug}/cuenta`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="t-label text-foreground">Nuevo día</span>
        <input
          type="date"
          className={FIELD_CLASSES}
          min={todayIn(timezone)}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>

      {date && (
        <div className="flex flex-col gap-3">
          <span className="t-label text-foreground">Horario</span>
          {loading ? (
            <Caption>Buscando horarios…</Caption>
          ) : slots && slots.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => {
                const value = localTime(slot.startsAt, timezone);
                return (
                  <SelectChip key={slot.startsAt} selected={time === value} onSelect={() => setTime(value)}>
                    {value}
                  </SelectChip>
                );
              })}
            </div>
          ) : (
            <Caption>No quedan horarios ese día. Prueba con otro.</Caption>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <BrandButton disabled={!time || submitting} onClick={submit}>
          {submitting ? "Reagendando…" : "Confirmar nuevo horario"}
        </BrandButton>
        <BrandButton variant="ghost" href={`/${slug}/cuenta`}>
          Volver
        </BrandButton>
      </div>
    </div>
  );
}
