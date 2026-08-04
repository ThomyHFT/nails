"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminCard, AdminPageHeader, BrandButton, Caption, SegmentedControl, Swatch } from "@/components/brand";

type ElementCategory = "color" | "finish" | "decoration" | "technique";

type DesignElement = {
  id: string;
  category: ElementCategory;
  code: string;
  label: string;
  colorHex: string | null;
  priceDeltaClp: number;
  extraMinutes: number;
  active: boolean;
};

const CATEGORIES: { value: ElementCategory; label: string }[] = [
  { value: "color", label: "Color" },
  { value: "finish", label: "Acabado" },
  { value: "decoration", label: "Decoración" },
  { value: "technique", label: "Técnica" },
];

function emptyForm() {
  return {
    category: "color" as ElementCategory,
    code: "",
    label: "",
    colorHex: "#FFFFFF",
    priceDeltaClp: 0,
    extraMinutes: 0,
  };
}

export function DisenoClient() {
  const [elements, setElements] = useState<DesignElement[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [status, setStatus] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const loadElements = useCallback(async () => {
    const response = await fetch("/api/design-elements");
    const data = await response.json();
    setElements(data.elements ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadElements();
  }, [loadElements]);

  async function createElement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreating) return;
    setStatus(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/design-elements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          code: form.code,
          label: form.label,
          colorHex: form.category === "color" ? form.colorHex : null,
          priceDeltaClp: form.priceDeltaClp,
          extraMinutes: form.extraMinutes,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setStatus(typeof data?.error === "string" ? data.error : "No se pudo crear el elemento.");
        return;
      }

      setForm(emptyForm());
      setStatus("Elemento creado.");
      loadElements();
    } finally {
      setIsCreating(false);
    }
  }

  async function updatePrice(id: string, priceDeltaClp: number) {
    setStatus(null);
    const response = await fetch("/api/design-elements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, priceDeltaClp }),
    });
    if (!response.ok) {
      setStatus("No se pudo actualizar el precio.");
      return;
    }
    loadElements();
  }

  async function updateExtraMinutes(id: string, extraMinutes: number) {
    setStatus(null);
    const response = await fetch("/api/design-elements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, extraMinutes }),
    });
    if (!response.ok) {
      setStatus("No se pudo actualizar los minutos extra.");
      return;
    }
    loadElements();
  }

  async function toggleActive(element: DesignElement) {
    setStatus(null);
    const response = await fetch("/api/design-elements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: element.id, active: !element.active }),
    });
    if (!response.ok) {
      setStatus("No se pudo actualizar el elemento.");
      return;
    }
    loadElements();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <AdminPageHeader
        title="Catálogo de diseño"
        description="Colores, acabados, decoraciones y técnicas que la clienta ve en el diseñador de uñas."
      />

      <AdminCard title="Nuevo elemento">
        <form onSubmit={createElement} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Categoría</Label>
            <SegmentedControl
              size="sm"
              options={CATEGORIES}
              value={form.category}
              onChange={(category) => setForm({ ...form, category })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="element-code">Código</Label>
              <Input
                id="element-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="ej: rojo-cherimoya"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="element-label">Nombre</Label>
              <Input
                id="element-label"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="ej: Rojo Cherimoya"
                required
              />
            </div>
          </div>

          {form.category === "color" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="element-color-hex">Color</Label>
              <div className="flex items-center gap-3">
                <Swatch color={form.colorHex} label={form.label || "Vista previa"} selected />
                <input
                  id="element-color-hex"
                  type="color"
                  value={form.colorHex}
                  onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
                  className="h-9 w-16 cursor-pointer rounded-lg border border-outline-variant bg-transparent p-0"
                />
                <Caption className="text-xs">{form.colorHex}</Caption>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="element-price">Precio extra (CLP)</Label>
              <Input
                id="element-price"
                type="number"
                min={0}
                value={form.priceDeltaClp}
                onChange={(e) => setForm({ ...form, priceDeltaClp: Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="element-minutes">Minutos extra</Label>
              <Input
                id="element-minutes"
                type="number"
                min={0}
                value={form.extraMinutes}
                onChange={(e) => setForm({ ...form, extraMinutes: Number(e.target.value) })}
              />
            </div>
          </div>

          <BrandButton type="submit" size="sm" className="w-fit" disabled={isCreating}>
            {isCreating ? "Creando…" : "Crear elemento"}
          </BrandButton>
        </form>
      </AdminCard>

      {CATEGORIES.map((category) => {
        const items = elements.filter((e) => e.category === category.value);
        if (items.length === 0) return null;

        return (
          <AdminCard key={category.value} title={category.label}>
            <ul className="flex flex-col gap-3">
              {items.map((element) => (
                <li
                  key={element.id}
                  className="flex flex-wrap items-center gap-3 border-b border-outline-variant pb-3 text-sm last:border-0 last:pb-0"
                >
                  {element.colorHex && <Swatch color={element.colorHex} label={element.label} className="size-8" />}
                  <span
                    className={
                      element.active ? "min-w-24 flex-1" : "min-w-24 flex-1 text-muted-foreground line-through"
                    }
                  >
                    {element.label}
                  </span>

                  <span className="flex items-center gap-1">
                    <Caption className="text-xs">$</Caption>
                    <Input
                      type="number"
                      min={0}
                      defaultValue={element.priceDeltaClp}
                      onBlur={(e) => {
                        const value = Number(e.target.value);
                        if (value !== element.priceDeltaClp) updatePrice(element.id, value);
                      }}
                      className="w-24"
                    />
                  </span>

                  <span className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      defaultValue={element.extraMinutes}
                      onBlur={(e) => {
                        const value = Number(e.target.value);
                        if (value !== element.extraMinutes) updateExtraMinutes(element.id, value);
                      }}
                      className="w-20"
                    />
                    <Caption className="text-xs">min</Caption>
                  </span>

                  <BrandButton variant="ghost" size="sm" onClick={() => toggleActive(element)}>
                    {element.active ? "Desactivar" : "Activar"}
                  </BrandButton>
                </li>
              ))}
            </ul>
          </AdminCard>
        );
      })}

      {status && <Caption>{status}</Caption>}
    </div>
  );
}
