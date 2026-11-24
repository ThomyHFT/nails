"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BrandButton, FIELD_CLASSES, Overline, TextAreaField, TextField } from "@/components/brand";

async function send(url: string, method: string, body?: unknown): Promise<string | null> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.ok) return null;
  const data = await response.json().catch(() => ({}));
  return typeof data.error === "string" ? data.error : "No se pudo guardar.";
}

const digits = (value: string) => Number(value.replace(/[^0-9]/g, ""));

function useSubmit() {
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

/** Agregar un paquete al catálogo (SPEC 21). */
export function NewPackageForm({ services }: { services: { id: string; name: string }[] }) {
  const { error, busy, run } = useSubmit();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [name, setName] = useState("");
  const [sessions, setSessions] = useState("4");
  const [price, setPrice] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(
      () => send("/api/packages", "POST", { serviceId, name, sessions: digits(sessions), priceClp: digits(price) }),
      () => {
        setName("");
        setPrice("");
      },
    );
  }

  if (services.length === 0) return null;

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-2">
        <Overline>Servicio</Overline>
        <select className={FIELD_CLASSES} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pack 4 manicures" maxLength={80} required />
      <TextField label="Sesiones" inputMode="numeric" value={sessions} onChange={(e) => setSessions(e.target.value)} required />
      <TextField label="Precio (CLP)" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="50000" required />
      <div className="flex items-center gap-3 sm:col-span-2">
        <BrandButton type="submit" size="sm" disabled={busy}>
          {busy ? "Guardando…" : "Agregar paquete"}
        </BrandButton>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </form>
  );
}

export function PackageActiveToggle({ packageId, active }: { packageId: string; active: boolean }) {
  const { error, busy, run } = useSubmit();
  return (
    <span className="flex items-center gap-2">
      <BrandButton
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => run(() => send(`/api/packages/${packageId}`, "PATCH", { active: !active }))}
      >
        {active ? "Desactivar" : "Activar"}
      </BrandButton>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}

/** Emitir una gift card (SPEC 21). */
export function NewGiftCardForm() {
  const { error, busy, run } = useSubmit();
  const [amount, setAmount] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [expiresOn, setExpiresOn] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(
      () =>
        send("/api/gift-cards", "POST", {
          amountClp: digits(amount),
          buyerName,
          recipientName,
          message: message || null,
          expiresOn: expiresOn || null,
        }),
      () => {
        setAmount("");
        setBuyerName("");
        setRecipientName("");
        setMessage("");
        setExpiresOn("");
      },
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <TextField label="Monto (CLP)" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="30000" required />
      <TextField label="Vence (opcional)" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
      <TextField label="La regala" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} maxLength={80} required />
      <TextField label="Para" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} maxLength={80} required />
      <TextAreaField
        label="Mensaje (opcional)"
        className="sm:col-span-2"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={300}
      />
      <div className="flex items-center gap-3 sm:col-span-2">
        <BrandButton type="submit" size="sm" disabled={busy}>
          {busy ? "Emitiendo…" : "Emitir gift card"}
        </BrandButton>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </form>
  );
}

/** Cobrar de una gift card o anularla (SPEC 21). */
export function GiftCardActions({
  giftCardId,
  balanceClp,
  canRedeem,
  canVoid,
}: {
  giftCardId: string;
  balanceClp: number;
  canRedeem: boolean;
  canVoid: boolean;
}) {
  const { error, busy, run } = useSubmit();
  const [amount, setAmount] = useState(String(balanceClp));
  const [confirmVoid, setConfirmVoid] = useState(false);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canRedeem && (
          <>
            <input
              aria-label="Monto a cobrar"
              inputMode="numeric"
              className={`${FIELD_CLASSES} h-9 w-28`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <BrandButton
              size="sm"
              disabled={busy || digits(amount) <= 0}
              onClick={() => run(() => send(`/api/gift-cards/${giftCardId}/redeem`, "POST", { amountClp: digits(amount) }))}
            >
              Cobrar
            </BrandButton>
          </>
        )}
        {canVoid &&
          (confirmVoid ? (
            <>
              <BrandButton
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => run(() => send(`/api/gift-cards/${giftCardId}/void`, "POST"))}
              >
                Sí, anular
              </BrandButton>
              <BrandButton size="sm" variant="ghost" onClick={() => setConfirmVoid(false)}>
                No
              </BrandButton>
            </>
          ) : (
            <BrandButton size="sm" variant="ghost" onClick={() => setConfirmVoid(true)}>
              Anular
            </BrandButton>
          ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** Vender un paquete y usar sus sesiones, en la ficha de la clienta (SPEC 21). */
export function SellPackageForm({ clientUserId, packages }: { clientUserId: string; packages: { id: string; label: string }[] }) {
  const { error, busy, run } = useSubmit();
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");
  if (packages.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          <Overline>Registrar venta</Overline>
          <select className={FIELD_CLASSES} value={packageId} onChange={(e) => setPackageId(e.target.value)}>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <BrandButton
          size="sm"
          disabled={busy || !packageId}
          onClick={() => run(() => send("/api/client-packages", "POST", { clientUserId, packageId }))}
        >
          Vender
        </BrandButton>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function PackageSessionActions({
  clientPackageId,
  canUse,
  canUndo,
}: {
  clientPackageId: string;
  canUse: boolean;
  canUndo: boolean;
}) {
  const { error, busy, run } = useSubmit();
  return (
    <span className="flex flex-col items-end gap-1">
      <span className="flex gap-2">
        {canUse && (
          <BrandButton
            size="sm"
            disabled={busy}
            onClick={() => run(() => send(`/api/client-packages/${clientPackageId}/redeem`, "POST", {}))}
          >
            Usar una sesión
          </BrandButton>
        )}
        {canUndo && (
          <BrandButton
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => run(() => send(`/api/client-packages/${clientPackageId}/redeem`, "DELETE"))}
          >
            Deshacer última
          </BrandButton>
        )}
      </span>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
