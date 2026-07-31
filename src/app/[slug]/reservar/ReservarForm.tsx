"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type VariantOption = {
  id: string;
  nailLength: string;
  priceClp: number;
  durationMinutes: number;
};

export type ServiceOption = {
  id: string;
  name: string;
  variants: VariantOption[];
};

type Slot = { startsAt: string; endsAt: string };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

export function ReservarForm({ slug, services }: { slug: string; services: ServiceOption[] }) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const service = services.find((s) => s.id === serviceId);
  const [variantId, setVariantId] = useState(service?.variants[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  async function loadSlots(nextDate: string, nextVariantId: string) {
    if (!nextDate || !nextVariantId) return;
    setIsLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const response = await fetch(
        `/api/bookings?slug=${slug}&serviceVariantId=${nextVariantId}&date=${nextDate}`,
      );
      const data = await response.json();
      setSlots(data.slots ?? []);
    } finally {
      setIsLoadingSlots(false);
    }
  }

  async function confirmBooking() {
    if (!selectedSlot || !variantId) return;
    setStatus(null);

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        serviceVariantId: variantId,
        date,
        startsAt: selectedSlot.startsAt,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      setStatus(typeof data.error === "string" ? data.error : "No se pudo confirmar la reserva.");
      return;
    }

    router.push(`/${slug}/cuenta`);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">Reservar hora</h1>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Servicio</label>
        <select
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            const nextService = services.find((s) => s.id === e.target.value);
            setVariantId(nextService?.variants[0]?.id ?? "");
            setSlots([]);
          }}
          className="rounded-md border px-2 py-1"
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Variante</label>
        <select
          value={variantId}
          onChange={(e) => {
            setVariantId(e.target.value);
            loadSlots(date, e.target.value);
          }}
          className="rounded-md border px-2 py-1"
        >
          {service?.variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nailLength} — ${v.priceClp.toLocaleString("es-CL")} — {v.durationMinutes} min
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Fecha</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            loadSlots(e.target.value, variantId);
          }}
        />
      </div>

      {isLoadingSlots && <p className="text-sm text-muted-foreground">Cargando horarios…</p>}

      {!isLoadingSlots && date && slots.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay horarios disponibles para esta fecha.</p>
      )}

      {slots.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {slots.map((slot) => (
            <Button
              key={slot.startsAt}
              type="button"
              variant={selectedSlot?.startsAt === slot.startsAt ? "default" : "outline"}
              onClick={() => setSelectedSlot(slot)}
            >
              {formatTime(slot.startsAt)}
            </Button>
          ))}
        </div>
      )}

      <Button disabled={!selectedSlot} onClick={confirmBooking}>
        Confirmar reserva
      </Button>

      {status && <p className="text-sm">{status}</p>}
    </div>
  );
}
