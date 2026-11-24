"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Caption, Panel, Title } from "@/components/brand";

type BankDetails = {
  bank: string;
  accountType: string;
  accountNumber: string;
  holderName: string;
  holderRut: string;
  email: string;
};

type Commerce = {
  depositClp: number | null;
  bankDetails: BankDetails | null;
  rebookAfterDays: number | null;
  giftCardsEnabled: boolean;
};

const EMPTY_BANK: BankDetails = {
  bank: "",
  accountType: "",
  accountNumber: "",
  holderName: "",
  holderRut: "",
  email: "",
};

const BANK_FIELDS: { key: keyof BankDetails; label: string; placeholder: string }[] = [
  { key: "holderName", label: "Titular", placeholder: "Nombre como aparece en el banco" },
  { key: "holderRut", label: "RUT", placeholder: "12.345.678-9" },
  { key: "bank", label: "Banco", placeholder: "BancoEstado" },
  { key: "accountType", label: "Tipo de cuenta", placeholder: "Cuenta RUT, corriente, vista…" },
  { key: "accountNumber", label: "Número de cuenta", placeholder: "12345678" },
  { key: "email", label: "Correo para el comprobante", placeholder: "tu@correo.cl" },
];

const REBOOK_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "No invitar" },
  { value: "14", label: "A las 2 semanas" },
  { value: "21", label: "A las 3 semanas" },
  { value: "28", label: "A las 4 semanas" },
  { value: "42", label: "A las 6 semanas" },
  { value: "60", label: "A los 2 meses" },
];

const SELECT_CLASSES =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Abono por transferencia, "vuelve a reservar" y gift cards (SPEC 21). */
export function CommercePanel() {
  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [depositOn, setDepositOn] = useState(false);
  const [depositText, setDepositText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/professional/commerce")
      .then((res) => res.json())
      .then((data: { commerce?: Commerce }) => {
        if (!data.commerce) return;
        setCommerce(data.commerce);
        setDepositOn(data.commerce.depositClp !== null);
        setDepositText(data.commerce.depositClp ? String(data.commerce.depositClp) : "");
      });
  }, []);

  if (!commerce) return null;
  const bank = commerce.bankDetails ?? EMPTY_BANK;

  function updateBank(key: keyof BankDetails, value: string) {
    setCommerce((current) => (current ? { ...current, bankDetails: { ...bank, [key]: value } } : current));
  }

  async function save() {
    if (!commerce || isSaving) return;
    setStatus(null);
    const depositClp = depositOn ? Number(depositText.replace(/[^0-9]/g, "")) : null;
    if (depositOn && !depositClp) {
      setStatus("Escribe el monto del abono.");
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch("/api/professional/commerce", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...commerce, depositClp }),
      });
      const data = await response.json().catch(() => ({}));
      setStatus(response.ok ? "Guardado." : (data.error ?? "No se pudo guardar."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Panel className="flex flex-col gap-5">
      <Title>Abono, invitaciones y gift cards</Title>

      <section className="flex flex-col gap-3">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={depositOn}
            onChange={(e) => setDepositOn(e.target.checked)}
            className="mt-0.5 accent-primary"
          />
          <span>
            <span className="font-medium">Pedir abono por transferencia</span>
            <Caption className="block text-xs">
              La reserva queda pendiente hasta que marques &quot;Abono recibido&quot;. La clienta ve tus datos al
              reservar y en el correo.
            </Caption>
          </span>
        </label>

        {depositOn && (
          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <Label htmlFor="deposit-amount">Monto del abono (CLP)</Label>
            <Input
              id="deposit-amount"
              inputMode="numeric"
              value={depositText}
              onChange={(e) => setDepositText(e.target.value)}
              placeholder="5000"
            />
            <Caption className="text-xs">Si el servicio cuesta menos, se pide el precio del servicio.</Caption>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {BANK_FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`bank-${f.key}`}>{f.label}</Label>
              <Input
                id={`bank-${f.key}`}
                value={bank[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => updateBank(f.key, e.target.value)}
                maxLength={120}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-1.5 sm:max-w-xs">
        <Label htmlFor="rebook-days">Invitar a volver a reservar</Label>
        <select
          id="rebook-days"
          className={SELECT_CLASSES}
          value={commerce.rebookAfterDays === null ? "" : String(commerce.rebookAfterDays)}
          onChange={(e) =>
            setCommerce({ ...commerce, rebookAfterDays: e.target.value ? Number(e.target.value) : null })
          }
        >
          {REBOOK_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Caption className="text-xs">
          Un correo después de una hora completada, solo si la clienta no tiene otra reservada.
        </Caption>
      </section>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={commerce.giftCardsEnabled}
          onChange={(e) => setCommerce({ ...commerce, giftCardsEnabled: e.target.checked })}
          className="mt-0.5 accent-primary"
        />
        <span>
          <span className="font-medium">Ofrecer gift cards en mi sitio</span>
          <Caption className="block text-xs">
            Aparece &quot;Regalar una gift card&quot;, que te escribe por WhatsApp. Las emites en Paquetes.
          </Caption>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={isSaving} className="w-fit">
          {isSaving ? "Guardando…" : "Guardar"}
        </Button>
        {status && (
          <p role="status" className="t-caption text-muted-foreground">
            {status}
          </p>
        )}
      </div>
    </Panel>
  );
}
