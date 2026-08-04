"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminCard, Chip, Overline } from "@/components/brand";
import { inviteCodeStatus, type InviteCode } from "@/server/domain/tenant/invite-code.entity";
import { VERTICALS, type Vertical } from "@/server/domain/tenant/vertical";

const VERTICAL_LABELS: Record<Vertical, string> = Object.fromEntries(
  VERTICALS.map((v) => [v.value, v.label]),
) as Record<Vertical, string>;

interface ProfessionalRow {
  id: string;
  slug: string;
  businessName: string;
  vertical: Vertical;
  active: boolean;
  publishedAt: string | null;
  trialEndsAt: string | null;
  createdAt: string;
}

interface InviteCodeRow {
  id: string;
  code: string;
  note: string | null;
  usedByProfessionalId: string | null;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

function toInviteCodeEntity(row: InviteCodeRow): InviteCode {
  return {
    id: row.id,
    code: row.code,
    note: row.note,
    usedByProfessionalId: row.usedByProfessionalId,
    usedAt: row.usedAt ? new Date(row.usedAt) : null,
    expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
    createdAt: new Date(row.createdAt),
  };
}

function daysLeft(trialEndsAt: string | null): { label: string; tone: "success" | "warning" | "danger" | "neutral" } {
  if (trialEndsAt === null) return { label: "Sin vencimiento", tone: "neutral" };

  const remainingMs = new Date(trialEndsAt).getTime() - Date.now();
  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

  if (remainingDays <= 0) return { label: "Prueba vencida", tone: "danger" };
  if (remainingDays <= 7) return { label: `${remainingDays} día${remainingDays === 1 ? "" : "s"} restantes`, tone: "warning" };
  return { label: `${remainingDays} días restantes`, tone: "success" };
}

export function AdminDashboard({
  initialProfessionals,
  initialInviteCodes,
}: {
  initialProfessionals: ProfessionalRow[];
  initialInviteCodes: InviteCodeRow[];
}) {
  const [professionals, setProfessionals] = useState(initialProfessionals);
  const [inviteCodes, setInviteCodes] = useState(initialInviteCodes);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [isCreatingCode, setIsCreatingCode] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<string | null>(null);

  async function toggleActive(professional: ProfessionalRow) {
    setPendingId(professional.id);
    try {
      const response = await fetch(`/api/admin/professionals/${professional.id}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !professional.active }),
      });
      if (!response.ok) return;
      const data = await response.json();
      setProfessionals((prev) => prev.map((p) => (p.id === professional.id ? { ...p, active: data.active } : p)));
    } finally {
      setPendingId(null);
    }
  }

  async function extendTrial(professional: ProfessionalRow, days: number | null) {
    setPendingId(professional.id);
    try {
      const response = await fetch(`/api/admin/professionals/${professional.id}/trial`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      if (!response.ok) return;
      const data = await response.json();
      setProfessionals((prev) =>
        prev.map((p) => (p.id === professional.id ? { ...p, trialEndsAt: data.trialEndsAt } : p)),
      );
    } finally {
      setPendingId(null);
    }
  }

  async function createInviteCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setIsCreatingCode(true);
    try {
      const response = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: note.trim() || null,
          expiresInDays: expiresInDays.trim() ? Number(expiresInDays) : null,
        }),
      });
      if (!response.ok) {
        setCreateError("No se pudo generar el código.");
        return;
      }
      const { code } = await response.json();
      setInviteCodes((prev) => [code, ...prev]);
      setJustCreated(code.code);
      setNote("");
      setExpiresInDays("");
    } finally {
      setIsCreatingCode(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <AdminCard title="Profesionales" description={`${professionals.length} en total`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="p-2">
                  <Overline>Negocio</Overline>
                </th>
                <th className="p-2">
                  <Overline>Rubro</Overline>
                </th>
                <th className="p-2">
                  <Overline>Estado</Overline>
                </th>
                <th className="p-2">
                  <Overline>Publicado</Overline>
                </th>
                <th className="p-2">
                  <Overline>Prueba</Overline>
                </th>
                <th className="p-2">
                  <Overline>Acciones</Overline>
                </th>
              </tr>
            </thead>
            <tbody>
              {professionals.map((professional) => {
                const trial = daysLeft(professional.trialEndsAt);
                const isPending = pendingId === professional.id;
                return (
                  <tr key={professional.id} className="border-b border-outline-variant last:border-0">
                    <td className="p-2">
                      <Link href={`/${professional.slug}`} className="font-medium hover:underline">
                        {professional.businessName}
                      </Link>
                      <div className="text-sm text-muted-foreground">/{professional.slug}</div>
                    </td>
                    <td className="p-2 text-sm text-muted-foreground">{VERTICAL_LABELS[professional.vertical]}</td>
                    <td className="p-2">
                      <Chip tone={professional.active ? "success" : "danger"}>
                        {professional.active ? "Activo" : "Inactivo"}
                      </Chip>
                    </td>
                    <td className="p-2">
                      <Chip tone={professional.publishedAt ? "success" : "neutral"}>
                        {professional.publishedAt ? "Publicado" : "Sin publicar"}
                      </Chip>
                    </td>
                    <td className="p-2">
                      <Chip tone={trial.tone}>{trial.label}</Chip>
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => toggleActive(professional)}
                        >
                          {professional.active ? "Desactivar" : "Activar"}
                        </Button>
                        <Button size="sm" variant="outline" disabled={isPending} onClick={() => extendTrial(professional, 7)}>
                          +7 días
                        </Button>
                        <Button size="sm" variant="outline" disabled={isPending} onClick={() => extendTrial(professional, 30)}>
                          +30 días
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => extendTrial(professional, null)}
                        >
                          Quitar vencimiento
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard title="Códigos de invitación" description="Genera y revisa los códigos entregados.">
        <form onSubmit={createInviteCode} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-note">Nota</Label>
            <Input
              id="invite-note"
              placeholder="Para quién es"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-expires">Vence en (días)</Label>
            <Input
              id="invite-expires"
              type="number"
              min={1}
              placeholder="Sin vencimiento"
              value={expiresInDays}
              onChange={(event) => setExpiresInDays(event.target.value)}
              className="w-40"
            />
          </div>
          <Button type="submit" disabled={isCreatingCode}>
            {isCreatingCode ? "Generando…" : "Generar código"}
          </Button>
        </form>
        {createError && <p className="text-sm text-destructive">{createError}</p>}
        {justCreated && (
          <p className="text-sm">
            Código generado: <span className="font-mono font-semibold">{justCreated}</span>
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="p-2">
                  <Overline>Código</Overline>
                </th>
                <th className="p-2">
                  <Overline>Nota</Overline>
                </th>
                <th className="p-2">
                  <Overline>Estado</Overline>
                </th>
                <th className="p-2">
                  <Overline>Vence</Overline>
                </th>
              </tr>
            </thead>
            <tbody>
              {inviteCodes.map((row) => {
                const status = inviteCodeStatus(toInviteCodeEntity(row));
                const tone = status === "available" ? "success" : status === "used" ? "neutral" : "danger";
                const label = status === "available" ? "Vigente" : status === "used" ? "Usado" : "Vencido";
                return (
                  <tr key={row.id} className="border-b border-outline-variant last:border-0">
                    <td className="p-2 font-mono">{row.code}</td>
                    <td className="p-2 text-sm text-muted-foreground">{row.note ?? "—"}</td>
                    <td className="p-2">
                      <Chip tone={tone}>{label}</Chip>
                    </td>
                    <td className="p-2 text-sm text-muted-foreground">
                      {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString("es-CL") : "Sin vencimiento"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
