"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/ImageUploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND_ARCHETYPES } from "@/server/domain/branding/brand-archetypes";
import { FONT_PAIR_FAMILIES } from "@/server/domain/branding/brand-tokens";
import type { BrandArchetype, BrandFontPair } from "@/server/domain/branding/brand-tokens";
import { resolveBrandTokens } from "@/server/domain/branding/resolve-brand-tokens";
import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";
import { BrandPreview } from "@/app/[slug]/admin/marca/BrandPreview";

const ARCHETYPES = Object.entries(BRAND_ARCHETYPES) as [BrandArchetype, (typeof BRAND_ARCHETYPES)[BrandArchetype]][];
const FONT_PAIRS = Object.entries(FONT_PAIR_FAMILIES) as [BrandFontPair, (typeof FONT_PAIR_FAMILIES)[BrandFontPair]][];

type FormState = {
  archetype: BrandArchetype;
  primaryColorHex: string;
  onPrimaryColorHex: string;
  fontPair: BrandFontPair | "";
  logoUrl: string;
  coverImageUrl: string;
};

function toFormState(branding: TenantBranding | null): FormState {
  return {
    archetype: branding?.archetype ?? "minimal_nude",
    primaryColorHex: branding?.primaryColorHex ?? "",
    onPrimaryColorHex: branding?.onPrimaryColorHex ?? "",
    fontPair: branding?.fontPair ?? "",
    logoUrl: branding?.logoUrl ?? "",
    coverImageUrl: branding?.coverImageUrl ?? "",
  };
}

export function MarcaForm({ slug }: { slug: string }) {
  const [form, setForm] = useState<FormState | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/branding");
    const data = await response.json();
    setForm(toFormState(data.branding ?? null));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial al montar
    load();
  }, [load]);

  const pendingBranding: TenantBranding | null = useMemo(() => {
    if (!form) return null;
    return {
      id: "pending",
      professionalId: "pending",
      archetype: form.archetype,
      primaryColorHex: form.primaryColorHex || null,
      onPrimaryColorHex: form.onPrimaryColorHex || null,
      fontPair: form.fontPair || null,
      logoUrl: form.logoUrl || null,
      coverImageUrl: form.coverImageUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }, [form]);

  const resolved = useMemo(() => resolveBrandTokens(pendingBranding), [pendingBranding]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setStatus(null);

    const response = await fetch("/api/branding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        archetype: form.archetype,
        primaryColorHex: form.primaryColorHex || null,
        onPrimaryColorHex: form.onPrimaryColorHex || null,
        fontPair: form.fontPair || null,
        logoUrl: form.logoUrl || null,
        coverImageUrl: form.coverImageUrl || null,
      }),
    });

    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(typeof data?.error === "string" ? data.error : "No se pudo guardar la marca.");
      return;
    }
    setStatus("Marca guardada.");
  }

  if (!form) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="archetype">Arquetipo</Label>
          <select
            id="archetype"
            value={form.archetype}
            onChange={(e) => setForm({ ...form, archetype: e.target.value as BrandArchetype })}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {ARCHETYPES.map(([value, definition]) => (
              <option key={value} value={value}>
                {definition.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="primaryColorHex">Color primario</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Selector de color primario"
                value={/^#[0-9A-Fa-f]{6}$/.test(form.primaryColorHex) ? form.primaryColorHex : "#000000"}
                onChange={(e) => setForm({ ...form, primaryColorHex: e.target.value })}
                className="h-8 w-8 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0"
              />
              <Input
                id="primaryColorHex"
                placeholder="Heredado del arquetipo"
                value={form.primaryColorHex}
                onChange={(e) => setForm({ ...form, primaryColorHex: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="onPrimaryColorHex">Texto sobre primario</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Selector de color de texto sobre el primario"
                value={/^#[0-9A-Fa-f]{6}$/.test(form.onPrimaryColorHex) ? form.onPrimaryColorHex : "#ffffff"}
                onChange={(e) => setForm({ ...form, onPrimaryColorHex: e.target.value })}
                className="h-8 w-8 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0"
              />
              <Input
                id="onPrimaryColorHex"
                placeholder="Heredado del arquetipo"
                value={form.onPrimaryColorHex}
                onChange={(e) => setForm({ ...form, onPrimaryColorHex: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fontPair">Par tipográfico</Label>
          <select
            id="fontPair"
            value={form.fontPair}
            onChange={(e) => setForm({ ...form, fontPair: e.target.value as BrandFontPair | "" })}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Heredado del arquetipo ({BRAND_ARCHETYPES[form.archetype].label})</option>
            {FONT_PAIRS.map(([value, families]) => (
              <option key={value} value={value}>
                {families.heading} + {families.body}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="logoUrl">Logo</Label>
          <ImageUploader
            pathPrefix={`branding/${slug}`}
            currentUrl={form.logoUrl || null}
            onUploaded={(url) => setForm({ ...form, logoUrl: url })}
          />
          <Input
            id="logoUrl"
            placeholder="o pega una URL https://…"
            value={form.logoUrl}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="coverImageUrl">Portada</Label>
          <ImageUploader
            pathPrefix={`branding/${slug}`}
            currentUrl={form.coverImageUrl || null}
            onUploaded={(url) => setForm({ ...form, coverImageUrl: url })}
          />
          <Input
            id="coverImageUrl"
            placeholder="o pega una URL https://…"
            value={form.coverImageUrl}
            onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
          />
        </div>

        <Button type="submit" disabled={saving} className="w-fit">
          {saving ? "Guardando…" : "Guardar marca"}
        </Button>
        {status && <p className="text-sm text-muted-foreground">{status}</p>}
      </form>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Preview en vivo</p>
        <div className="flex gap-3">
          <BrandPreview label="Claro" tokens={resolved.light} fontPair={resolved.fontPair} />
          <BrandPreview label="Oscuro" tokens={resolved.dark} fontPair={resolved.fontPair} />
        </div>
      </div>
    </div>
  );
}
