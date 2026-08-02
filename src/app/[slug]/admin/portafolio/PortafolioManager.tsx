"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminCard, BrandButton, Caption, MediaFrame, Panel } from "@/components/brand";

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
  const [isCreating, setIsCreating] = useState(false);

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
    if (!newImageUrl || isCreating) return;
    setStatus(null);
    setIsCreating(true);

    try {
      await createItemRequest();
    } finally {
      setIsCreating(false);
    }
  }

  async function createItemRequest() {
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
      <AdminCard title="Nueva foto">
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
            className="h-8 rounded-lg border border-outline-variant bg-background px-2 text-sm"
          >
            <option value="">Ninguno</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <BrandButton size="sm" disabled={!newImageUrl || isCreating} onClick={createItem} className="w-fit">
          {isCreating ? "Guardando…" : "Guardar en el portafolio"}
        </BrandButton>
      </AdminCard>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <Panel key={item.id} padding="sm" className="flex flex-col gap-3">
            <MediaFrame src={item.imageUrl} alt={item.caption ?? ""} ratio="square" />
            {item.caption && <Caption className="text-xs">{item.caption}</Caption>}
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <BrandButton variant="outline" size="sm" onClick={() => togglePublished(item)}>
                {item.published ? "Despublicar" : "Publicar"}
              </BrandButton>
              <BrandButton variant="danger" size="sm" onClick={() => deleteItem(item.id)}>
                Eliminar
              </BrandButton>
            </div>
          </Panel>
        ))}
      </div>

      {items.length === 0 && <Caption>Todavía no subiste ninguna foto.</Caption>}

      {status && <Caption>{status}</Caption>}
    </div>
  );
}
