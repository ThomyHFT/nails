"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/ImageUploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PortfolioItem = {
  id: string;
  imageUrl: string;
  caption: string | null;
  serviceId: string | null;
  sortOrder: number;
  published: boolean;
};

type Service = { id: string; name: string };

export function PortafolioManager({ slug }: { slug: string }) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [newCaption, setNewCaption] = useState("");
  const [newServiceId, setNewServiceId] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [itemsRes, servicesRes] = await Promise.all([fetch("/api/portfolio"), fetch("/api/services")]);
    const itemsData = await itemsRes.json();
    const servicesData = await servicesRes.json();
    setItems(itemsData.items ?? []);
    setServices((servicesData.services ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial al montar
    load();
  }, [load]);

  async function createItem() {
    if (!newImageUrl) return;
    setStatus(null);

    const response = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: newImageUrl,
        caption: newCaption || null,
        serviceId: newServiceId || null,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(typeof data?.error === "string" ? data.error : "No se pudo guardar el ítem.");
      return;
    }

    setNewImageUrl(null);
    setNewCaption("");
    setNewServiceId("");
    load();
  }

  async function togglePublished(item: PortfolioItem) {
    setStatus(null);
    const response = await fetch("/api/portfolio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, published: !item.published }),
    });
    if (!response.ok) {
      setStatus("No se pudo actualizar la publicación.");
      return;
    }
    load();
  }

  async function updateSortOrder(id: string, sortOrder: number) {
    setStatus(null);
    const response = await fetch("/api/portfolio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, sortOrder }),
    });
    if (!response.ok) {
      setStatus("No se pudo actualizar el orden.");
      return;
    }
    load();
  }

  async function deleteItem(id: string) {
    setStatus(null);
    const response = await fetch(`/api/portfolio?id=${id}`, { method: "DELETE" });
    if (!response.ok) {
      setStatus("No se pudo eliminar el ítem.");
      return;
    }
    load();
  }

  return (
    <div className="flex flex-col gap-8">
      <div
        className="flex flex-col gap-3 p-4"
        style={{
          background: "var(--card)",
          color: "var(--card-foreground)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
        }}
      >
        <p className="text-sm font-medium">Nueva foto</p>
        <ImageUploader pathPrefix={`portfolio/${slug}`} onUploaded={setNewImageUrl} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="caption">Bajada (opcional)</Label>
          <Input id="caption" value={newCaption} onChange={(e) => setNewCaption(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="service">Servicio asociado (opcional)</Label>
          <select
            id="service"
            value={newServiceId}
            onChange={(e) => setNewServiceId(e.target.value)}
            className="h-8 px-2 text-sm"
            style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--background)" }}
          >
            <option value="">Ninguno</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <Button type="button" disabled={!newImageUrl} onClick={createItem} className="w-fit">
          Guardar en el portafolio
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-2 p-3"
            style={{
              background: "var(--card)",
              color: "var(--card-foreground)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- URL de Vercel Blob, no un asset local optimizable */}
            <img src={item.imageUrl} alt={item.caption ?? ""} className="aspect-square w-full rounded object-cover" />
            {item.caption && <p className="text-xs">{item.caption}</p>}
            <div className="flex items-center gap-2">
              <Label htmlFor={`order-${item.id}`} className="text-xs">
                Orden
              </Label>
              <Input
                id={`order-${item.id}`}
                type="number"
                defaultValue={item.sortOrder}
                onBlur={(e) => {
                  const value = Number(e.target.value);
                  if (value !== item.sortOrder) updateSortOrder(item.id, value);
                }}
                className="w-16"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" onClick={() => togglePublished(item)}>
                {item.published ? "Despublicar" : "Publicar"}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => deleteItem(item.id)}>
                Eliminar
              </Button>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Todavía no subiste ninguna foto.
        </p>
      )}

      {status && <p className="text-sm">{status}</p>}
    </div>
  );
}
