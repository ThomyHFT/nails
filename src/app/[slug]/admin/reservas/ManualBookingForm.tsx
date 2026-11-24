"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Caption, Panel, Title } from "@/components/brand";

export interface ManualBookingVariantOption {
  id: string;
  label: string;
}

export interface ManualBookingClientOption {
  id: string;
  name: string;
  phone: string | null;
}

const SELECT_CLASSES =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Reserva que anota la profesional (SPEC 18): la que llegó por WhatsApp,
 * Instagram o en persona. Queda confirmada al guardarla.
 */
export function ManualBookingForm({
  variants,
  clients,
  staff = [],
}: {
  variants: ManualBookingVariantOption[];
  clients: ManualBookingClientOption[];
  /** Integrantes activas (SPEC 22). Con una sola no se muestra el selector. */
  staff?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientMode, setClientMode] = useState<"existing" | "new">(clients.length > 0 ? "existing" : "new");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("10:00");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-fit" disabled={variants.length === 0}>
        <Plus className="size-4" /> Nueva reserva
      </Button>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setError(null);
    setIsSaving(true);
    try {
      const response = await fetch("/api/bookings/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceVariantId: variantId,
          date,
          time,
          clientNote: note.trim() || null,
          staffId: staffId || null,
          client:
            clientMode === "existing"
              ? { kind: "existing", userId: clientId }
              : { kind: "new", name, phone, email: email.trim() || null },
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(typeof data.error === "string" ? data.error : "No se pudo guardar la reserva. Revisa los datos.");
        return;
      }
      setOpen(false);
      setName("");
      setPhone("");
      setEmail("");
      setNote("");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Title>Nueva reserva</Title>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
      <Caption>Para las horas que te piden por WhatsApp, Instagram o en persona. Queda confirmada.</Caption>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-sm font-medium">Clienta</legend>
          {clients.length > 0 && (
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="client-mode"
                  checked={clientMode === "existing"}
                  onChange={() => setClientMode("existing")}
                  className="accent-primary"
                />
                Una de mis clientas
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="client-mode"
                  checked={clientMode === "new"}
                  onChange={() => setClientMode("new")}
                  className="accent-primary"
                />
                Clienta nueva
              </label>
            </div>
          )}

          {clientMode === "existing" ? (
            <select
              aria-label="Clienta"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={SELECT_CLASSES}
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.phone ? ` · ${client.phone}` : ""}
                </option>
              ))}
            </select>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="manual-name">Nombre</Label>
                <Input id="manual-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="manual-phone">Teléfono</Label>
                <Input
                  id="manual-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+56 9 1234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="manual-email">Correo (opcional)</Label>
                <Input id="manual-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
          )}
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5 sm:col-span-3">
            <Label htmlFor="manual-variant">Servicio</Label>
            <select
              id="manual-variant"
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              className={SELECT_CLASSES}
            >
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.label}
                </option>
              ))}
            </select>
          </div>
          {staff.length > 1 && (
            <div className="flex flex-col gap-1.5 sm:col-span-3">
              <Label htmlFor="manual-staff">Atiende</Label>
              <select id="manual-staff" value={staffId} onChange={(e) => setStaffId(e.target.value)} className={SELECT_CLASSES}>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="manual-date">Fecha</Label>
            <Input id="manual-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="manual-time">Hora</Label>
            <Input id="manual-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manual-note">Nota (opcional)</Label>
          <Input id="manual-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={isSaving} className="w-fit">
          {isSaving ? "Guardando…" : "Guardar reserva"}
        </Button>
      </form>
    </Panel>
  );
}
