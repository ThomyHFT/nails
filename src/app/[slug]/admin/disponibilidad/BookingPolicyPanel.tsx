"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Caption, Panel, Title } from "@/components/brand";

type Policy = {
  autoConfirm: boolean;
  slotIntervalMinutes: number | null;
  minLeadMinutes: number;
  maxAdvanceDays: number | null;
  cancellationDeadlineHours: number;
};

const SELECT_CLASSES =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const INTERVAL_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Según la duración del servicio" },
  { value: "15", label: "Cada 15 minutos" },
  { value: "30", label: "Cada 30 minutos" },
  { value: "60", label: "Cada 1 hora" },
];

const LEAD_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Sin anticipación mínima" },
  { value: 60, label: "1 hora antes" },
  { value: 120, label: "2 horas antes" },
  { value: 240, label: "4 horas antes" },
  { value: 720, label: "12 horas antes" },
  { value: 1440, label: "1 día antes" },
  { value: 2880, label: "2 días antes" },
];

const ADVANCE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Sin límite" },
  { value: "7", label: "Hasta 1 semana" },
  { value: "14", label: "Hasta 2 semanas" },
  { value: "30", label: "Hasta 1 mes" },
  { value: "60", label: "Hasta 2 meses" },
  { value: "90", label: "Hasta 3 meses" },
];

const DEADLINE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "En cualquier momento" },
  { value: 2, label: "Hasta 2 horas antes" },
  { value: 12, label: "Hasta 12 horas antes" },
  { value: 24, label: "Hasta 24 horas antes" },
  { value: 48, label: "Hasta 48 horas antes" },
];

/** "Reglas de reserva" (SPEC 19): cómo y cuándo pueden reservar y cancelar sus clientas. */
export function BookingPolicyPanel() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/availability/policy")
      .then((res) => res.json())
      .then((data) => setPolicy(data.policy ?? null));
  }, []);

  if (!policy) return null;

  function update<K extends keyof Policy>(key: K, value: Policy[K]) {
    setPolicy((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!policy || isSaving) return;
    setStatus(null);
    setIsSaving(true);
    try {
      const response = await fetch("/api/availability/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy),
      });
      setStatus(response.ok ? "Reglas guardadas." : "No se pudieron guardar las reglas.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Panel className="flex flex-col gap-4">
      <Title>Reglas de reserva</Title>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={policy.autoConfirm}
          onChange={(e) => update("autoConfirm", e.target.checked)}
          className="mt-0.5 accent-primary"
        />
        <span>
          <span className="font-medium">Confirmar reservas automáticamente</span>
          <Caption className="block text-xs">
            Si lo desactivas, cada reserva queda pendiente hasta que la confirmes.
          </Caption>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="policy-interval">Horarios ofrecidos</Label>
          <select
            id="policy-interval"
            className={SELECT_CLASSES}
            value={policy.slotIntervalMinutes === null ? "" : String(policy.slotIntervalMinutes)}
            onChange={(e) => update("slotIntervalMinutes", e.target.value ? Number(e.target.value) : null)}
          >
            {INTERVAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="policy-lead">Reservar con anticipación mínima</Label>
          <select
            id="policy-lead"
            className={SELECT_CLASSES}
            value={policy.minLeadMinutes}
            onChange={(e) => update("minLeadMinutes", Number(e.target.value))}
          >
            {LEAD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="policy-advance">Reservar con anticipación máxima</Label>
          <select
            id="policy-advance"
            className={SELECT_CLASSES}
            value={policy.maxAdvanceDays === null ? "" : String(policy.maxAdvanceDays)}
            onChange={(e) => update("maxAdvanceDays", e.target.value ? Number(e.target.value) : null)}
          >
            {ADVANCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="policy-deadline">La clienta puede cancelar o reagendar</Label>
          <select
            id="policy-deadline"
            className={SELECT_CLASSES}
            value={policy.cancellationDeadlineHours}
            onChange={(e) => update("cancellationDeadlineHours", Number(e.target.value))}
          >
            {DEADLINE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={isSaving} className="w-fit">
          {isSaving ? "Guardando…" : "Guardar reglas"}
        </Button>
        {status && <Caption>{status}</Caption>}
      </div>
    </Panel>
  );
}
