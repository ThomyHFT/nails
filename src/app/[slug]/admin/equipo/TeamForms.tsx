"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BrandButton, Caption, TextField } from "@/components/brand";

async function send(url: string, method: string, body: unknown): Promise<string | null> {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (response.ok) return null;
  const data = await response.json().catch(() => ({}));
  return typeof data.error === "string" ? data.error : "No se pudo guardar.";
}

function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(task: () => Promise<string | null>, onOk?: () => void) {
    setError(null);
    setBusy(true);
    try {
      const err = await task();
      if (err) setError(err);
      else {
        onOk?.();
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }
  return { error, busy, run };
}

/** Agregar una integrante (SPEC 22). El correo es opcional: sin él, es solo un nombre con agenda. */
export function AddStaffForm({ disabled }: { disabled: boolean }) {
  const { error, busy, run } = useAction();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(
      () => send("/api/team", "POST", { name, email: email.trim() || null }),
      () => {
        setName("");
        setEmail("");
      },
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required disabled={disabled} />
      <TextField
        label="Correo (para darle acceso)"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="opcional"
        disabled={disabled}
      />
      <BrandButton type="submit" size="sm" disabled={busy || disabled}>
        {busy ? "Agregando…" : "Agregar"}
      </BrandButton>
      {error && <p className="text-sm text-destructive sm:col-span-3">{error}</p>}
    </form>
  );
}

export interface StaffCardData {
  id: string;
  name: string;
  isOwner: boolean;
  active: boolean;
  hasAccess: boolean;
  allServices: boolean;
  serviceIds: string[];
}

/** Lo que la dueña cambia de una integrante: activa, acceso y servicios (SPEC 22). */
export function StaffControls({ staff, services }: { staff: StaffCardData; services: { id: string; name: string }[] }) {
  const { error, busy, run } = useAction();
  const [email, setEmail] = useState("");
  const [allServices, setAllServices] = useState(staff.allServices);
  const [selected, setSelected] = useState<Set<string>>(new Set(staff.serviceIds));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Servicios que hace</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-primary" checked={allServices} onChange={(e) => setAllServices(e.target.checked)} />
          Todos
        </label>
        {!allServices && (
          <div className="grid gap-1 sm:grid-cols-2">
            {services.map((service) => (
              <label key={service.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={selected.has(service.id)}
                  onChange={() => toggle(service.id)}
                />
                {service.name}
              </label>
            ))}
          </div>
        )}
        <BrandButton
          size="sm"
          variant="outline"
          className="w-fit"
          disabled={busy}
          onClick={() => run(() => send(`/api/team/${staff.id}`, "PATCH", { allServices, serviceIds: [...selected] }))}
        >
          Guardar servicios
        </BrandButton>
      </fieldset>

      {!staff.isOwner && !staff.hasAccess && (
        <div className="flex flex-wrap items-end gap-2">
          <TextField
            label="Darle acceso con su correo"
            type="email"
            className="min-w-0 flex-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <BrandButton
            size="sm"
            variant="outline"
            disabled={busy || !email.trim()}
            onClick={() => run(() => send(`/api/team/${staff.id}/access`, "POST", { email }), () => setEmail(""))}
          >
            Dar acceso
          </BrandButton>
        </div>
      )}

      {!staff.isOwner && (
        <BrandButton
          size="sm"
          variant={staff.active ? "ghost" : "outline"}
          className="w-fit"
          disabled={busy}
          onClick={() => run(() => send(`/api/team/${staff.id}`, "PATCH", { active: !staff.active }))}
        >
          {staff.active ? "Desactivar" : "Activar"}
        </BrandButton>
      )}
      {error && <Caption className="text-destructive">{error}</Caption>}
    </div>
  );
}
