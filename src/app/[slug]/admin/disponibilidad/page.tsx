"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const WEEKDAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

type RuleRow = { weekday: number; startTime: string; endTime: string; enabled: boolean };

type AvailabilityRule = { id: string; weekday: number; startTime: string; endTime: string };
type AvailabilityException = { id: string; date: string; kind: "blocked" | "extra"; startTime: string | null; endTime: string | null };

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function nextMonth(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, mon, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function defaultRuleRows(): RuleRow[] {
  return WEEKDAYS.map((w) => ({ weekday: w.value, startTime: "09:00", endTime: "18:00", enabled: false }));
}

export default function DisponibilidadPage() {
  const [month] = useState(currentMonth());
  const [ruleRows, setRuleRows] = useState<RuleRow[]>(defaultRuleRows());
  const [currentMonthHasRules, setCurrentMonthHasRules] = useState(true);
  const [nextMonthHasRules, setNextMonthHasRules] = useState(true);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [exceptionDate, setExceptionDate] = useState("");
  const [exceptionKind, setExceptionKind] = useState<"blocked" | "extra">("blocked");
  const [exceptionStart, setExceptionStart] = useState("09:00");
  const [exceptionEnd, setExceptionEnd] = useState("18:00");

  const loadRules = useCallback(async () => {
    const response = await fetch(`/api/availability/rules?month=${month}`);
    const data = await response.json();
    const rules: AvailabilityRule[] = data.rules ?? [];
    setRuleRows(
      defaultRuleRows().map((row) => {
        const match = rules.find((r) => r.weekday === row.weekday);
        return match
          ? { weekday: row.weekday, startTime: match.startTime, endTime: match.endTime, enabled: true }
          : row;
      }),
    );
    setCurrentMonthHasRules(rules.length > 0);

    const nextResponse = await fetch(`/api/availability/rules?month=${nextMonth(month)}`);
    const nextData = await nextResponse.json();
    setNextMonthHasRules((nextData.rules ?? []).length > 0);
  }, [month]);

  const loadExceptions = useCallback(async () => {
    const response = await fetch(`/api/availability/exceptions?month=${month}`);
    const data = await response.json();
    setExceptions(data.exceptions ?? []);
  }, [month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadRules();
    loadExceptions();
    fetch("/api/availability/buffer")
      .then((res) => res.json())
      .then((data) => setBufferMinutes(data.bufferMinutes ?? 0));
  }, [loadRules, loadExceptions]);

  function toggleRow(weekday: number) {
    setRuleRows((rows) => rows.map((r) => (r.weekday === weekday ? { ...r, enabled: !r.enabled } : r)));
  }

  function updateRow(weekday: number, field: "startTime" | "endTime", value: string) {
    setRuleRows((rows) => rows.map((r) => (r.weekday === weekday ? { ...r, [field]: value } : r)));
  }

  async function saveRules() {
    setStatus(null);
    const rules = ruleRows
      .filter((r) => r.enabled)
      .map((r) => ({ weekday: r.weekday, startTime: r.startTime, endTime: r.endTime }));

    const response = await fetch("/api/availability/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ effectiveMonth: month, rules }),
    });

    if (!response.ok) {
      setStatus("No se pudo guardar la disponibilidad.");
      return;
    }

    setStatus("Disponibilidad guardada.");
    loadRules();
  }

  async function saveBuffer() {
    setStatus(null);
    const response = await fetch("/api/availability/buffer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bufferMinutes }),
    });

    setStatus(response.ok ? "Buffer guardado." : "No se pudo guardar el buffer.");
  }

  async function createException(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const response = await fetch("/api/availability/exceptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: exceptionDate,
        kind: exceptionKind,
        startTime: exceptionKind === "extra" ? exceptionStart : null,
        endTime: exceptionKind === "extra" ? exceptionEnd : null,
      }),
    });

    if (!response.ok) {
      setStatus("No se pudo guardar la excepción.");
      return;
    }

    setExceptionDate("");
    loadExceptions();
  }

  async function removeException(id: string) {
    await fetch(`/api/availability/exceptions?id=${id}`, { method: "DELETE" });
    loadExceptions();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--tenant-font-heading)" }}>
        Disponibilidad
      </h1>

      {!currentMonthHasRules && (
        <p className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm">
          Todavía no cargaste disponibilidad para este mes. No se podrán agendar reservas hasta que lo hagas.
        </p>
      )}

      {!nextMonthHasRules && (
        <p className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm">
          Todavía no cargaste disponibilidad para el próximo mes. No se podrán agendar reservas en ese mes hasta que
          lo hagas.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Días del mes ({month})</h2>
        {ruleRows.map((row) => (
          <div key={row.weekday} className="flex items-center gap-3">
            <input type="checkbox" checked={row.enabled} onChange={() => toggleRow(row.weekday)} />
            <span className="w-24">{WEEKDAYS.find((w) => w.value === row.weekday)?.label}</span>
            <Input
              type="time"
              value={row.startTime}
              disabled={!row.enabled}
              onChange={(e) => updateRow(row.weekday, "startTime", e.target.value)}
              className="w-32"
            />
            <span>a</span>
            <Input
              type="time"
              value={row.endTime}
              disabled={!row.enabled}
              onChange={(e) => updateRow(row.weekday, "endTime", e.target.value)}
              className="w-32"
            />
          </div>
        ))}
        <Button onClick={saveRules} className="w-fit">
          Guardar días del mes
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Buffer entre citas</h2>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={0}
            max={240}
            value={bufferMinutes}
            onChange={(e) => setBufferMinutes(Number(e.target.value))}
            className="w-24"
          />
          <span>minutos</span>
          <Button onClick={saveBuffer}>Guardar buffer</Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Excepciones puntuales</h2>
        <form onSubmit={createException} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Label htmlFor="exception-date">Fecha</Label>
            <Input
              id="exception-date"
              type="date"
              value={exceptionDate}
              onChange={(e) => setExceptionDate(e.target.value)}
              required
              className="w-40"
            />
            <select
              value={exceptionKind}
              onChange={(e) => setExceptionKind(e.target.value as "blocked" | "extra")}
              className="px-2 py-1 text-sm"
              style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--background)" }}
            >
              <option value="blocked">Bloquear día</option>
              <option value="extra">Horario extra</option>
            </select>
            {exceptionKind === "extra" && (
              <>
                <Input type="time" value={exceptionStart} onChange={(e) => setExceptionStart(e.target.value)} className="w-32" />
                <span>a</span>
                <Input type="time" value={exceptionEnd} onChange={(e) => setExceptionEnd(e.target.value)} className="w-32" />
              </>
            )}
          </div>
          <Button type="submit" className="w-fit">
            Agregar excepción
          </Button>
        </form>

        <ul className="flex flex-col gap-2">
          {exceptions.map((exception) => (
            <li key={exception.id} className="flex items-center gap-3 text-sm">
              <span>{exception.date}</span>
              <span>{exception.kind === "blocked" ? "Bloqueado" : `Extra ${exception.startTime}–${exception.endTime}`}</span>
              <Button variant="ghost" size="sm" onClick={() => removeException(exception.id)}>
                Eliminar
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {status && <p className="text-sm">{status}</p>}
    </div>
  );
}
