"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NailDesigner, type NailDesignerResult } from "@/app/[slug]/(public)/reservar/NailDesigner";

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
type Step = "select" | "design" | "schedule";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function ReservarForm({
  slug,
  services,
  initialServiceId,
}: {
  slug: string;
  services: ServiceOption[];
  initialServiceId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select");

  const [serviceId, setServiceId] = useState(initialServiceId ?? services[0]?.id ?? "");
  const service = services.find((s) => s.id === serviceId);
  const [variantId, setVariantId] = useState(service?.variants[0]?.id ?? "");

  const [daysWithSlots, setDaysWithSlots] = useState<string[]>([]);
  const [isLoadingDays, setIsLoadingDays] = useState(false);

  const [design, setDesign] = useState<NailDesignerResult | null>(null);

  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  async function loadDaysWithSlots(nextVariantId: string) {
    if (!nextVariantId) return;
    setIsLoadingDays(true);
    try {
      const response = await fetch(
        `/api/availability/days?slug=${slug}&serviceVariantId=${nextVariantId}&month=${currentMonth()}`,
      );
      const data = await response.json();
      setDaysWithSlots(data.days ?? []);
    } finally {
      setIsLoadingDays(false);
    }
  }

  async function loadSlots(nextDate: string) {
    if (!nextDate || !variantId) return;
    setIsLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const extraMinutes = design?.quote.extraMinutes ?? 0;
      const response = await fetch(
        `/api/bookings?slug=${slug}&serviceVariantId=${variantId}&date=${nextDate}&extraMinutes=${extraMinutes}`,
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
        design: design
          ? {
              payload: design.payload,
              expectedExtraPriceClp: design.quote.extraPriceClp,
              expectedExtraMinutes: design.quote.extraMinutes,
            }
          : undefined,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      setStatus(typeof data.error === "string" ? data.error : "No se pudo confirmar la reserva.");
      return;
    }

    router.push(`/${slug}/cuenta`);
  }

  if (step === "select") {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--tenant-font-heading)" }}>
          Reservar hora
        </h1>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Servicio</label>
          <select
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              const nextService = services.find((s) => s.id === e.target.value);
              const nextVariantId = nextService?.variants[0]?.id ?? "";
              setVariantId(nextVariantId);
              setDaysWithSlots([]);
              loadDaysWithSlots(nextVariantId);
            }}
            className="h-9 px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--background)" }}
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
              loadDaysWithSlots(e.target.value);
            }}
            className="h-9 px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--background)" }}
          >
            {service?.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nailLength} — ${v.priceClp.toLocaleString("es-CL")} — {v.durationMinutes} min
              </option>
            ))}
          </select>
        </div>

        <div
          className="flex flex-col gap-2 p-4"
          style={{ background: "var(--card)", color: "var(--card-foreground)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
        >
          <p className="text-sm font-medium">Días con cupo este mes</p>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            El horario final depende del diseño que elijas: algunos horarios de estos días pueden desaparecer al
            sumar los minutos extra.
          </p>
          {isLoadingDays && (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Cargando…
            </p>
          )}
          {!isLoadingDays && daysWithSlots.length === 0 && (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              No hay días con cupo este mes todavía.
            </p>
          )}
          {!isLoadingDays && daysWithSlots.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {daysWithSlots.map((d) => (
                <span
                  key={d}
                  className="px-2 py-1 text-xs"
                  style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
                >
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>

        <Button disabled={!variantId} onClick={() => setStep("design")}>
          Continuar
        </Button>
      </div>
    );
  }

  if (step === "design") {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--tenant-font-heading)" }}>
          Diseña tus uñas
        </h1>

        <NailDesigner slug={slug} onChange={setDesign} />

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setDesign(null);
              setStep("schedule");
            }}
          >
            Reservar sin diseño
          </Button>
          <Button disabled={!design} onClick={() => setStep("schedule")}>
            Continuar con este diseño
          </Button>
        </div>
      </div>
    );
  }

  const variant = service?.variants.find((v) => v.id === variantId) ?? null;
  const totalPriceClp = (variant?.priceClp ?? 0) + (design?.quote.extraPriceClp ?? 0);
  const designSummary = design
    ? `Diseño personalizado (+$${design.quote.extraPriceClp.toLocaleString("es-CL")}, +${design.quote.extraMinutes} min)`
    : "Sin diseño";

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--tenant-font-heading)" }}>
        Elegí fecha y hora
      </h1>

      <Button variant="ghost" className="w-fit" onClick={() => setStep("design")}>
        ‹ Editar diseño
      </Button>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Fecha</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            loadSlots(e.target.value);
          }}
        />
      </div>

      {isLoadingSlots && (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Cargando horarios…
        </p>
      )}

      {!isLoadingSlots && date && slots.length === 0 && (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          No hay horarios disponibles para esta fecha
          {design ? ` considerando los ${design.quote.extraMinutes} minutos extra del diseño` : ""}. Podés elegir
          otro día{design ? " o volver a editar el diseño" : ""}.
        </p>
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

      {selectedSlot && (
        <div
          className="flex flex-col gap-2 p-4 text-sm"
          style={{
            background: "var(--card)",
            color: "var(--card-foreground)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          <p className="text-sm font-medium">Resumen de tu reserva</p>
          <div className="flex justify-between">
            <span>Servicio</span>
            <span>
              {service?.name} ({variant?.nailLength})
            </span>
          </div>
          <div className="flex justify-between">
            <span>Diseño</span>
            <span>{designSummary}</span>
          </div>
          <div className="flex justify-between">
            <span>Fecha</span>
            <span>{new Date(`${date}T00:00:00`).toLocaleDateString("es-CL", { dateStyle: "long" })}</span>
          </div>
          <div className="flex justify-between">
            <span>Hora</span>
            <span>{formatTime(selectedSlot.startsAt)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>${totalPriceClp.toLocaleString("es-CL")}</span>
          </div>
          <p className="pt-1" style={{ color: "var(--muted-foreground)" }}>
            El pago es presencial, en el local, al momento de tu cita.
          </p>
        </div>
      )}

      <Button disabled={!selectedSlot} onClick={confirmBooking}>
        Confirmar reserva
      </Button>

      {status && <p className="text-sm">{status}</p>}
    </div>
  );
}
