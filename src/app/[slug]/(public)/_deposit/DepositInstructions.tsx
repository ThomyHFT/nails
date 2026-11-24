"use client";

import { useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { BrandButton, Caption, Panel, Title } from "@/components/brand";

export interface DepositInfo {
  /** Filas a mostrar: titular, RUT, banco, cuenta, correo. */
  rows: { label: string; value: string }[];
  /** Lo mismo en texto plano, para copiar y pegar en la app del banco. */
  text: string;
  /** wa.me de la profesional para mandar el comprobante; `null` si no tiene teléfono visible. */
  whatsAppUrl: string | null;
}

/** Cómo transferir el abono (SPEC 21). La usan la pantalla de reserva y "Mis reservas". */
export function DepositInstructions({
  amountClp,
  info,
  compact = false,
}: {
  amountClp: number;
  info: DepositInfo;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${info.text}\nMonto: $${amountClp.toLocaleString("es-CL")}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Panel padding="sm" className="flex flex-col gap-3">
      {!compact && <Title>Transfiere el abono para confirmar</Title>}
      <p className="text-sm">
        Abono: <strong>${amountClp.toLocaleString("es-CL")}</strong>. Se descuenta del total el día de tu hora.
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {info.rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="break-all">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2">
        <BrandButton size="sm" variant="outline" onClick={copy} icon={<Copy className="size-4" />} iconPosition="start">
          {copied ? "Copiado" : "Copiar datos"}
        </BrandButton>
        {info.whatsAppUrl && (
          <BrandButton
            size="sm"
            href={info.whatsAppUrl}
            icon={<MessageCircle className="size-4" />}
            iconPosition="start"
          >
            Enviar comprobante
          </BrandButton>
        )}
      </div>
      <Caption className="text-xs">Tu hora queda confirmada cuando la profesional recibe el abono.</Caption>
    </Panel>
  );
}
