"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/ImageUploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionCard, SegmentedControl } from "@/components/brand";
import { BRAND_ARCHETYPES } from "@/server/domain/branding/brand-archetypes";
import { FONT_PAIR_FAMILIES } from "@/server/domain/branding/brand-tokens";
import type { BrandArchetype, BrandFontPair } from "@/server/domain/branding/brand-tokens";
import {
  DEFAULT_SECTION_ORDER,
  HERO_LAYOUTS,
  resolveSectionOrder,
  type HeroLayout,
  type PortadaSection,
} from "@/server/domain/branding/portada-layout";
import { resolveBrandTokens } from "@/server/domain/branding/resolve-brand-tokens";
import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";
import { BrandPreview } from "@/app/[slug]/admin/marca/BrandPreview";

const ARCHETYPES = Object.entries(BRAND_ARCHETYPES) as [BrandArchetype, (typeof BRAND_ARCHETYPES)[BrandArchetype]][];
const FONT_PAIRS = Object.entries(FONT_PAIR_FAMILIES) as [BrandFontPair, (typeof FONT_PAIR_FAMILIES)[BrandFontPair]][];

const HERO_LAYOUT_LABELS: Record<HeroLayout, string> = {
  split: "Foto al costado",
  stacked: "Foto arriba",
  minimal: "Sin foto",
};

const SECTION_LABELS: Record<PortadaSection, string> = {
  servicios: "Servicios",
  galeria: "Galería",
  opiniones: "Opiniones",
  contacto: "Contacto",
};

type SectionRow = { key: PortadaSection; included: boolean };

function toSectionRows(sectionOrder: unknown): SectionRow[] {
  const included = resolveSectionOrder(sectionOrder);
  const rest = DEFAULT_SECTION_ORDER.filter((section) => !included.includes(section));
  return [...included, ...rest].map((key) => ({ key, included: included.includes(key) }));
}

type FormState = {
  archetype: BrandArchetype;
  primaryColorHex: string;
  onPrimaryColorHex: string;
  fontPair: BrandFontPair | "";
  logoUrl: string;
  coverImageUrl: string;
  heroLayout: HeroLayout;
  sectionRows: SectionRow[];
  tagline: string;
  phone: string;
  phoneVisible: boolean;
  address: string;
  addressVisible: boolean;
};

type ContactInfo = {
  phone: string | null;
  phoneVisible: boolean;
  address: string | null;
  addressVisible: boolean;
};

function toFormState(branding: TenantBranding | null, tagline: string | null, contact: ContactInfo | null): FormState {
  return {
    archetype: branding?.archetype ?? "minimal_nude",
    primaryColorHex: branding?.primaryColorHex ?? "",
    onPrimaryColorHex: branding?.onPrimaryColorHex ?? "",
    fontPair: branding?.fontPair ?? "",
    logoUrl: branding?.logoUrl ?? "",
    coverImageUrl: branding?.coverImageUrl ?? "",
    heroLayout: branding?.heroLayout ?? "split",
    sectionRows: toSectionRows(branding?.sectionOrder ?? null),
    tagline: tagline ?? "",
    phone: contact?.phone ?? "",
    phoneVisible: contact?.phoneVisible ?? true,
    address: contact?.address ?? "",
    addressVisible: contact?.addressVisible ?? true,
  };
}

export function MarcaForm({ slug }: { slug: string }) {
  const [form, setForm] = useState<FormState | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [brandingResponse, taglineResponse, contactoResponse] = await Promise.all([
      fetch("/api/branding"),
      fetch("/api/professional/tagline"),
      fetch("/api/professional/contacto"),
    ]);
    const brandingData = await brandingResponse.json();
    const taglineData = await taglineResponse.json();
    const contactoData = await contactoResponse.json();
    setForm(toFormState(brandingData.branding ?? null, taglineData.tagline ?? null, contactoResponse.ok ? contactoData : null));
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
      heroLayout: form.heroLayout,
      sectionOrder: form.sectionRows.filter((row) => row.included).map((row) => row.key),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }, [form]);

  const resolved = useMemo(() => resolveBrandTokens(pendingBranding), [pendingBranding]);

  function moveSectionRow(index: number, direction: -1 | 1) {
    setForm((current) => {
      if (!current) return current;
      const rows = [...current.sectionRows];
      const target = index + direction;
      if (target < 0 || target >= rows.length) return current;
      [rows[index], rows[target]] = [rows[target], rows[index]];
      return { ...current, sectionRows: rows };
    });
  }

  function toggleSectionRow(index: number) {
    setForm((current) => {
      if (!current) return current;
      const rows = current.sectionRows.map((row, i) => (i === index ? { ...row, included: !row.included } : row));
      return { ...current, sectionRows: rows };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setStatus(null);

    const [brandingResponse, taglineResponse, contactoResponse] = await Promise.all([
      fetch("/api/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archetype: form.archetype,
          primaryColorHex: form.primaryColorHex || null,
          onPrimaryColorHex: form.onPrimaryColorHex || null,
          fontPair: form.fontPair || null,
          logoUrl: form.logoUrl || null,
          coverImageUrl: form.coverImageUrl || null,
          heroLayout: form.heroLayout,
          sectionOrder: form.sectionRows.filter((row) => row.included).map((row) => row.key),
        }),
      }),
      fetch("/api/professional/tagline", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagline: form.tagline || null }),
      }),
      fetch("/api/professional/contacto", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: form.phone || null,
          phoneVisible: form.phoneVisible,
          address: form.address || null,
          addressVisible: form.addressVisible,
        }),
      }),
    ]);

    setSaving(false);
    if (!brandingResponse.ok || !taglineResponse.ok || !contactoResponse.ok) {
      const failed = [brandingResponse, taglineResponse, contactoResponse].find((r) => !r.ok);
      const data = await failed?.json().catch(() => null);
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
          <Label htmlFor="tagline">Titular del hero</Label>
          <Input
            id="tagline"
            placeholder="Ej: Manicura que dura, diseños que enamoran"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Arquetipo</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ARCHETYPES.map(([value, definition]) => (
              <OptionCard
                key={value}
                label={definition.label}
                selected={form.archetype === value}
                onSelect={() => setForm({ ...form, archetype: value })}
              >
                <span
                  className="h-10 w-full rounded-lg border border-outline-variant"
                  style={{
                    background: `linear-gradient(135deg, ${definition.light.primary}, ${definition.light.accent})`,
                  }}
                />
              </OptionCard>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Layout del hero</Label>
          <SegmentedControl
            options={HERO_LAYOUTS.map((value) => ({ value, label: HERO_LAYOUT_LABELS[value] }))}
            value={form.heroLayout}
            onChange={(value) => setForm({ ...form, heroLayout: value })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Secciones de la portada</Label>
          <p className="text-xs text-muted-foreground">
            Desmarca una sección para ocultarla, o cambia el orden con las flechas.
          </p>
          <ul className="flex flex-col gap-1.5">
            {form.sectionRows.map((row, index) => (
              <li
                key={row.key}
                className="flex items-center gap-3 rounded-lg border border-input bg-transparent px-3 py-2"
              >
                <label className="flex flex-1 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={row.included}
                    onChange={() => toggleSectionRow(index)}
                    className="size-4 rounded border-input"
                  />
                  {SECTION_LABELS[row.key]}
                </label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => moveSectionRow(index, -1)}
                    aria-label={`Subir ${SECTION_LABELS[row.key]}`}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={index === form.sectionRows.length - 1}
                    onClick={() => moveSectionRow(index, 1)}
                    aria-label={`Bajar ${SECTION_LABELS[row.key]}`}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
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
          {/* Colapsado por defecto: con la miniatura de arriba, mostrar la URL
              completa de Vercel Blob en un input a ancho completo era ruido —
              la vía normal es subir la imagen, esto es solo el escape hatch
              para pegar una URL externa. */}
          <details className="group">
            <summary className="w-fit cursor-pointer text-xs text-muted-foreground">
              Pegar una URL en vez de subir
            </summary>
            <Input
              id="logoUrl"
              placeholder="https://…"
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              className="mt-2"
            />
          </details>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="coverImageUrl">Portada</Label>
          <ImageUploader
            pathPrefix={`branding/${slug}`}
            currentUrl={form.coverImageUrl || null}
            onUploaded={(url) => setForm({ ...form, coverImageUrl: url })}
          />
          <details className="group">
            <summary className="w-fit cursor-pointer text-xs text-muted-foreground">
              Pegar una URL en vez de subir
            </summary>
            <Input
              id="coverImageUrl"
              placeholder="https://…"
              value={form.coverImageUrl}
              onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
              className="mt-2"
            />
          </details>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Teléfono de contacto</Label>
          <div className="flex items-center gap-2">
            <Input
              id="phone"
              placeholder="+56 9 1234 5678"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm({ ...form, phoneVisible: !form.phoneVisible })}
            >
              {form.phoneVisible ? "Visible" : "Oculto"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Se usa para el botón de WhatsApp. Si lo ocultas, no aparece en el sitio público aunque esté cargado.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="address">Dirección</Label>
          <div className="flex items-center gap-2">
            <Input
              id="address"
              placeholder="Ej: Av. Siempre Viva 742, Santiago"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm({ ...form, addressVisible: !form.addressVisible })}
            >
              {form.addressVisible ? "Visible" : "Oculta"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Si la ocultas, no aparece en el sitio público aunque esté cargada.
          </p>
        </div>

        <Button type="submit" disabled={saving} className="w-fit">
          {saving ? "Guardando…" : "Guardar marca"}
        </Button>
        {status && <p className="text-sm text-muted-foreground">{status}</p>}
      </form>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Preview en vivo</p>
          <div className="flex gap-3">
            <BrandPreview label="Claro" tokens={resolved.light} fontPair={resolved.fontPair} />
            <BrandPreview label="Oscuro" tokens={resolved.dark} fontPair={resolved.fontPair} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">Orden de la portada</p>
          <ol className="flex flex-col gap-1 text-sm text-muted-foreground">
            <li>1. Hero ({HERO_LAYOUT_LABELS[form.heroLayout]})</li>
            {form.sectionRows
              .filter((row) => row.included)
              .map((row, index) => (
                <li key={row.key}>
                  {index + 2}. {SECTION_LABELS[row.key]}
                </li>
              ))}
          </ol>
          <p className="text-xs text-muted-foreground">
            Para ver la portada real, ábrela en otra pestaña.
          </p>
        </div>
      </div>
    </div>
  );
}
