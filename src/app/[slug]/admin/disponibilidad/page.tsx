"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminPageHeader } from "@/components/brand/admin";
import { InfoNote } from "@/components/brand/booking";
import { Chip } from "@/components/brand/chip";
import { Panel } from "@/components/brand/surface";
import { Body, Caption, Title } from "@/components/brand/typography";
import { GoogleCalendarPanel } from "@/app/[slug]/admin/disponibilidad/GoogleCalendarPanel";
import { cn } from "@/lib/utils";

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
type AvailabilityException = {
  id: string;
  date: string;
  kind: "blocked" | "extra";
  startTime: string | null;
  endTime: string | null;
  note: string | null;
};

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function monthLabel(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, mon - 1, 1));
  const label = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function daysInMonth(month: string): number {
  const [year, mon] = month.split("-").map(Number);
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}

function leadingBlanks(month: string): number {
  const [year, mon] = month.split("-").map(Number);
  const jsWeekday = new Date(Date.UTC(year, mon - 1, 1)).getUTCDay();
  return (jsWeekday + 6) % 7;
}

function dateAt(month: string, day: number): string {
  const [year, mon] = month.split("-").map(Number);
  return `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function defaultRuleRows(): RuleRow[] {
  return WEEKDAYS.map((w) => ({ weekday: w.value, startTime: "09:00", endTime: "18:00", enabled: false }));
}

type DayStatus = "blocked" | "extra" | "open" | "closed";

const DAY_STATUS_STYLES: Record<DayStatus, string> = {
  blocked: "bg-destructive-tint text-destructive",
  extra: "bg-primary-tint text-primary",
  open: "bg-success-tint text-on-success-tint",
  closed: "bg-surface-2 text-muted-foreground",
};

export default function DisponibilidadPage() {
  const [month, setMonth] = useState(currentMonth());
  const [ruleRows, setRuleRows] = useState<RuleRow[]>(defaultRuleRows());
  const [currentMonthHasRules, setCurrentMonthHasRules] = useState(true);
  const [nextMonthHasRules, setNextMonthHasRules] = useState(true);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [isSavingBuffer, setIsSavingBuffer] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [extraStart, setExtraStart] = useState("09:00");
  const [extraEnd, setExtraEnd] = useState("18:00");
  const [extraNote, setExtraNote] = useState("");

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
  }, [month]);

  const loadExceptions = useCallback(async () => {
    const response = await fetch(`/api/availability/exceptions?month=${month}`);
    const data = await response.json();
    setExceptions(data.exceptions ?? []);
  }, [month]);

  // El aviso de "mes sin cargar" mira siempre el mes calendario real y el
  // siguiente, sin importar qué mes esté navegando la profesional en la
  // grilla — si no, dejaría de avisar apenas navegara a otro mes.
  useEffect(() => {
    const real = currentMonth();
    fetch(`/api/availability/rules?month=${real}`)
      .then((res) => res.json())
      .then((data) => setCurrentMonthHasRules((data.rules ?? []).length > 0));
    fetch(`/api/availability/rules?month=${shiftMonth(real, 1)}`)
      .then((res) => res.json())
      .then((data) => setNextMonthHasRules((data.rules ?? []).length > 0));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reloads data when the viewed month changes
    loadRules();
    loadExceptions();
  }, [loadRules, loadExceptions]);

  function changeMonth(delta: number) {
    setSelectedDate(null);
    setMonth((m) => shiftMonth(m, delta));
  }

  useEffect(() => {
    fetch("/api/availability/buffer")
      .then((res) => res.json())
      .then((data) => setBufferMinutes(data.bufferMinutes ?? 0));
  }, []);

  function toggleRow(weekday: number) {
    setRuleRows((rows) => rows.map((r) => (r.weekday === weekday ? { ...r, enabled: !r.enabled } : r)));
  }

  function updateRow(weekday: number, field: "startTime" | "endTime", value: string) {
    setRuleRows((rows) => rows.map((r) => (r.weekday === weekday ? { ...r, [field]: value } : r)));
  }

  async function saveRules() {
    if (isSavingRules) return;
    setStatus(null);
    setIsSavingRules(true);
    const rules = ruleRows
      .filter((r) => r.enabled)
      .map((r) => ({ weekday: r.weekday, startTime: r.startTime, endTime: r.endTime }));

    try {
      const response = await fetch("/api/availability/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ effectiveMonth: month, rules }),
      });

      if (!response.ok) {
        setStatus("No se pudo guardar el horario base.");
        return;
      }

      setStatus("Horario base guardado.");
      loadRules();
    } finally {
      setIsSavingRules(false);
    }
  }

  async function saveBuffer() {
    if (isSavingBuffer) return;
    setStatus(null);
    setIsSavingBuffer(true);
    try {
      const response = await fetch("/api/availability/buffer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bufferMinutes }),
      });

      setStatus(response.ok ? "Buffer guardado." : "No se pudo guardar el buffer.");
    } finally {
      setIsSavingBuffer(false);
    }
  }

  async function toggleBlocked(date: string, blockedExceptionId: string | null) {
    setStatus(null);
    if (blockedExceptionId) {
      await fetch(`/api/availability/exceptions?id=${blockedExceptionId}`, { method: "DELETE" });
    } else {
      await fetch("/api/availability/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, kind: "blocked", startTime: null, endTime: null, note: null }),
      });
    }
    loadExceptions();
  }

  async function addExtraRange(date: string) {
    setStatus(null);
    const response = await fetch("/api/availability/exceptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        kind: "extra",
        startTime: extraStart,
        endTime: extraEnd,
        note: extraNote || null,
      }),
    });

    if (!response.ok) {
      setStatus("No se pudo guardar el horario extra.");
      return;
    }

    setExtraNote("");
    loadExceptions();
  }

  async function removeException(id: string) {
    await fetch(`/api/availability/exceptions?id=${id}`, { method: "DELETE" });
    loadExceptions();
  }

  const exceptionsByDate = useMemo(() => {
    const map = new Map<string, AvailabilityException[]>();
    for (const exception of exceptions) {
      const list = map.get(exception.date) ?? [];
      list.push(exception);
      map.set(exception.date, list);
    }
    return map;
  }, [exceptions]);

  function dayStatus(date: string, weekday: number): DayStatus {
    const dayExceptions = exceptionsByDate.get(date) ?? [];
    if (dayExceptions.some((e) => e.kind === "blocked")) return "blocked";
    if (dayExceptions.some((e) => e.kind === "extra")) return "extra";
    const rule = ruleRows.find((r) => r.weekday === weekday);
    return rule?.enabled ? "open" : "closed";
  }

  const total = daysInMonth(month);
  const blanks = leadingBlanks(month);
  const cells: { day: number | null; date: string | null; weekday: number | null }[] = [
    ...Array.from({ length: blanks }, () => ({ day: null, date: null, weekday: null })),
    ...Array.from({ length: total }, (_, i) => {
      const day = i + 1;
      const date = dateAt(month, day);
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
      return { day, date, weekday };
    }),
  ];

  const selectedExceptions = selectedDate ? (exceptionsByDate.get(selectedDate) ?? []) : [];
  const selectedBlocked = selectedExceptions.find((e) => e.kind === "blocked") ?? null;
  const selectedExtras = selectedExceptions.filter((e) => e.kind === "extra");
  const selectedWeekday = selectedDate ? new Date(`${selectedDate}T00:00:00Z`).getUTCDay() : null;
  const selectedRule = selectedWeekday !== null ? ruleRows.find((r) => r.weekday === selectedWeekday) : undefined;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <AdminPageHeader
        title="Disponibilidad"
        description="Configura el horario base de la semana y ajusta días puntuales desde el calendario."
      />

      {!currentMonthHasRules && (
        <InfoNote tone="warning">
          Todavía no cargaste el horario base de este mes. No se podrán agendar reservas hasta que lo hagas.
        </InfoNote>
      )}

      {!nextMonthHasRules && (
        <InfoNote tone="warning">
          Todavía no cargaste el horario base del próximo mes. No se podrán agendar reservas en ese mes hasta que lo
          hagas.
        </InfoNote>
      )}

      <details className="group" open={!currentMonthHasRules}>
        <summary className="cursor-pointer list-none">
          <Panel padding="sm" className="flex items-center justify-between">
            <Title>Horario base semanal</Title>
            <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
          </Panel>
        </summary>
        <Panel className="mt-3 flex flex-col gap-3">
          <Caption>Se aplica a {monthLabel(month)}. Cada mes se define de nuevo.</Caption>
          {ruleRows.map((row) => (
            <div key={row.weekday} className="flex flex-wrap items-center gap-3">
              <input
                id={`weekday-${row.weekday}`}
                type="checkbox"
                checked={row.enabled}
                onChange={() => toggleRow(row.weekday)}
                className="accent-primary"
              />
              <Label htmlFor={`weekday-${row.weekday}`} className="w-20 shrink-0 font-normal">
                {WEEKDAYS.find((w) => w.value === row.weekday)?.label}
              </Label>
              <Input
                type="time"
                value={row.startTime}
                disabled={!row.enabled}
                onChange={(e) => updateRow(row.weekday, "startTime", e.target.value)}
                className="w-32"
              />
              <Caption className="text-xs">a</Caption>
              <Input
                type="time"
                value={row.endTime}
                disabled={!row.enabled}
                onChange={(e) => updateRow(row.weekday, "endTime", e.target.value)}
                className="w-32"
              />
            </div>
          ))}
          <Button onClick={saveRules} disabled={isSavingRules} className="w-fit">
            {isSavingRules ? "Guardando…" : "Guardar horario base"}
          </Button>
        </Panel>
      </details>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)} aria-label="Mes anterior">
            <ChevronLeft className="size-4" />
          </Button>
          <Title>{monthLabel(month)}</Title>
          <Button variant="ghost" size="sm" onClick={() => changeMonth(1)} aria-label="Mes siguiente">
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {WEEKDAYS.slice(0, 6)
            .concat(WEEKDAYS[6])
            .map((w) => (
              <span key={w.value}>{w.label.slice(0, 3)}</span>
            ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (cell.day === null || cell.date === null || cell.weekday === null) {
              return <div key={`blank-${i}`} />;
            }
            const isSelected = selectedDate === cell.date;
            const cellStatus = dayStatus(cell.date, cell.weekday);
            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => setSelectedDate(cell.date)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border text-sm transition-colors",
                  isSelected ? "border-primary" : "border-transparent",
                  DAY_STATUS_STYLES[cellStatus],
                )}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-full", DAY_STATUS_STYLES.open)} /> Abierto
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-full", DAY_STATUS_STYLES.extra)} /> Horario extra
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-full", DAY_STATUS_STYLES.blocked)} /> Bloqueado
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-full", DAY_STATUS_STYLES.closed)} /> Sin horario
          </span>
        </div>
      </section>

      {selectedDate && (
        <Panel className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Title>
              {new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
                new Date(`${selectedDate}T00:00:00Z`),
              )}
            </Title>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
              Cerrar
            </Button>
          </div>

          <Body className="text-sm">
            {selectedRule?.enabled
              ? `Horario base: ${selectedRule.startTime}–${selectedRule.endTime}`
              : "Sin horario base este día de la semana."}
          </Body>

          <div className="flex items-center gap-3">
            {selectedBlocked ? (
              <>
                <Chip tone="danger">Día bloqueado</Chip>
                <Button variant="ghost" size="sm" onClick={() => toggleBlocked(selectedDate, selectedBlocked.id)}>
                  Quitar bloqueo
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => toggleBlocked(selectedDate, null)}>
                Bloquear día completo
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Caption>Horarios extra este día</Caption>
            {selectedExtras.length === 0 && <Body className="text-sm text-muted-foreground">Ninguno.</Body>}
            {selectedExtras.map((extra) => (
              <div key={extra.id} className="flex items-center gap-3 text-sm">
                <Chip tone="primary">
                  {extra.startTime}–{extra.endTime}
                </Chip>
                {extra.note && <Caption>{extra.note}</Caption>}
                <Button variant="ghost" size="sm" onClick={() => removeException(extra.id)}>
                  Eliminar
                </Button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-outline-variant pt-3">
            <Caption>Agregar horario extra</Caption>
            <div className="flex flex-wrap items-center gap-3">
              <Input type="time" value={extraStart} onChange={(e) => setExtraStart(e.target.value)} className="w-32" />
              <span>a</span>
              <Input type="time" value={extraEnd} onChange={(e) => setExtraEnd(e.target.value)} className="w-32" />
              <Label htmlFor="extra-note" className="sr-only">
                Nota
              </Label>
              <Input
                id="extra-note"
                placeholder="Nota (opcional)"
                value={extraNote}
                onChange={(e) => setExtraNote(e.target.value)}
                className="w-48"
              />
              <Button size="sm" onClick={() => addExtraRange(selectedDate)}>
                Agregar
              </Button>
            </div>
          </div>
        </Panel>
      )}

      <section className="flex flex-col gap-3">
        <Title>Buffer entre citas</Title>
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
          <Button onClick={saveBuffer} disabled={isSavingBuffer}>
            {isSavingBuffer ? "Guardando…" : "Guardar buffer"}
          </Button>
        </div>
      </section>

      {status && <p className="text-sm">{status}</p>}

      <GoogleCalendarPanel />
    </div>
  );
}
