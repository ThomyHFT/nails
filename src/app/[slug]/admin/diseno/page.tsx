"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export default function DisenoPage() {
  const [elements, setElements] = useState<DesignElement[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [status, setStatus] = useState<string | null>(null);

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
    setStatus(null);

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
      <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--tenant-font-heading)" }}>
        Catálogo de diseño
      </h1>

      <form
        onSubmit={createElement}
        className="flex flex-col gap-3 p-4"
        style={{ background: "var(--card)", color: "var(--card-foreground)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
      >
        <h2 className="text-lg font-medium">Nuevo elemento</h2>

        <div className="flex items-center gap-3">
          <Label htmlFor="element-category">Categoría</Label>
          <select
            id="element-category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as ElementCategory })}
            className="px-2 py-1 text-sm"
            style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--background)" }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="element-code">Código</Label>
          <Input
            id="element-code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
            className="w-40"
          />
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="element-label">Nombre</Label>
          <Input
            id="element-label"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            required
            className="w-56"
          />
        </div>

        {form.category === "color" && (
          <div className="flex items-center gap-3">
            <Label htmlFor="element-color-hex">Color</Label>
            <input
              id="element-color-hex"
              type="color"
              value={form.colorHex}
              onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
            />
            <span className="text-sm">{form.colorHex}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Label htmlFor="element-price">Precio extra (CLP)</Label>
          <Input
            id="element-price"
            type="number"
            min={0}
            value={form.priceDeltaClp}
            onChange={(e) => setForm({ ...form, priceDeltaClp: Number(e.target.value) })}
            className="w-32"
          />
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="element-minutes">Minutos extra</Label>
          <Input
            id="element-minutes"
            type="number"
            min={0}
            value={form.extraMinutes}
            onChange={(e) => setForm({ ...form, extraMinutes: Number(e.target.value) })}
            className="w-32"
          />
        </div>

        <Button type="submit" className="w-fit">
          Crear elemento
        </Button>
      </form>

      {CATEGORIES.map((category) => {
        const items = elements.filter((e) => e.category === category.value);
        if (items.length === 0) return null;

        return (
          <section key={category.value} className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">{category.label}</h2>
            <ul className="flex flex-col gap-2">
              {items.map((element) => (
                <li key={element.id} className="flex items-center gap-3 text-sm">
                  {element.colorHex && (
                    <span
                      className="inline-block size-4 rounded-full border"
                      style={{ backgroundColor: element.colorHex }}
                    />
                  )}
                  <span className={element.active ? "" : "text-muted-foreground line-through"}>{element.label}</span>
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
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(element)}>
                    {element.active ? "Desactivar" : "Activar"}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {status && <p className="text-sm">{status}</p>}
    </div>
  );
}
