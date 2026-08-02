"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminCard, AdminPageHeader, BrandButton, Caption } from "@/components/brand";
import { ImageUploader } from "@/components/ImageUploader";

type NailLength = "short" | "medium" | "long" | "single";

type ServiceVariant = {
  id: string;
  nailLength: NailLength;
  priceClp: number;
  durationMinutes: number;
  active: boolean;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  active: boolean;
  variants: ServiceVariant[];
};

const NAIL_LENGTHS: { value: NailLength; label: string }[] = [
  { value: "short", label: "Corta" },
  { value: "medium", label: "Media" },
  { value: "long", label: "Larga" },
  { value: "single", label: "Única" },
];

function emptyVariantForm(serviceId: string) {
  return { serviceId, nailLength: "short" as NailLength, priceClp: 0, durationMinutes: 30 };
}

export default function ServiciosPage() {
  const params = useParams<{ slug: string }>();
  const [services, setServices] = useState<Service[]>([]);
  const [newServiceName, setNewServiceName] = useState("");
  const [variantForm, setVariantForm] = useState<ReturnType<typeof emptyVariantForm> | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingServiceName, setEditingServiceName] = useState("");
  const [confirmDeleteServiceId, setConfirmDeleteServiceId] = useState<string | null>(null);
  const [confirmDeleteVariantId, setConfirmDeleteVariantId] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    const response = await fetch("/api/services");
    const data = await response.json();
    setServices(data.services ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial al montar
    loadServices();
  }, [loadServices]);

  async function createService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const response = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newServiceName }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(typeof data?.error === "string" ? data.error : "No se pudo crear el servicio.");
      return;
    }

    setNewServiceName("");
    loadServices();
  }

  async function toggleServiceActive(service: Service) {
    setStatus(null);
    const response = await fetch("/api/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: service.id, active: !service.active }),
    });
    if (!response.ok) {
      setStatus("No se pudo actualizar el servicio.");
      return;
    }
    loadServices();
  }

  async function saveServiceName(serviceId: string) {
    setStatus(null);
    const response = await fetch("/api/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: serviceId, name: editingServiceName }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(typeof data?.error === "string" ? data.error : "No se pudo renombrar el servicio.");
      return;
    }
    setEditingServiceId(null);
    loadServices();
  }

  async function saveServiceImage(serviceId: string, imageUrl: string) {
    setStatus(null);
    const response = await fetch("/api/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: serviceId, imageUrl }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(typeof data?.error === "string" ? data.error : "No se pudo actualizar la foto.");
      return;
    }
    loadServices();
  }

  async function deleteService(serviceId: string) {
    setStatus(null);
    const response = await fetch(`/api/services?id=${serviceId}`, { method: "DELETE" });
    setConfirmDeleteServiceId(null);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(typeof data?.error === "string" ? data.error : "No se pudo eliminar el servicio.");
      return;
    }
    loadServices();
  }

  async function deleteVariant(variantId: string) {
    setStatus(null);
    const response = await fetch(`/api/services/variants?id=${variantId}`, { method: "DELETE" });
    setConfirmDeleteVariantId(null);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(typeof data?.error === "string" ? data.error : "No se pudo eliminar la variante.");
      return;
    }
    loadServices();
  }

  async function createVariant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!variantForm) return;
    setStatus(null);

    const response = await fetch("/api/services/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(variantForm),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(typeof data?.error === "string" ? data.error : "No se pudo crear la variante.");
      return;
    }

    setVariantForm(null);
    loadServices();
  }

  async function updateVariantPrice(variantId: string, priceClp: number) {
    setStatus(null);
    const response = await fetch("/api/services/variants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: variantId, priceClp }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(typeof data?.error === "string" ? data.error : "No se pudo actualizar el precio.");
      return;
    }
    loadServices();
  }

  async function updateVariantDuration(variantId: string, durationMinutes: number) {
    setStatus(null);
    const response = await fetch("/api/services/variants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: variantId, durationMinutes }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(typeof data?.error === "string" ? data.error : "No se pudo actualizar la duración.");
      return;
    }
    loadServices();
  }

  async function toggleVariantActive(variant: ServiceVariant) {
    setStatus(null);
    const response = await fetch("/api/services/variants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: variant.id, active: !variant.active }),
    });
    if (!response.ok) {
      setStatus("No se pudo actualizar la variante.");
      return;
    }
    loadServices();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <AdminPageHeader
        title="Servicios"
        description="Cada servicio tiene variantes por largo de uña, con su precio y duración."
      />

      <form onSubmit={createService} className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="new-service-name">Nuevo servicio</Label>
          <Input
            id="new-service-name"
            value={newServiceName}
            onChange={(e) => setNewServiceName(e.target.value)}
            placeholder="Ej: Manicure spa"
            required
          />
        </div>
        <Button type="submit">Crear</Button>
      </form>

      <div className="flex flex-col gap-4">
        {services.map((service) => (
          <AdminCard
            key={service.id}
            title={
              editingServiceId === service.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={editingServiceName}
                    onChange={(e) => setEditingServiceName(e.target.value)}
                    className="h-8"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => saveServiceName(service.id)}>
                    Guardar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingServiceId(null)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className={service.active ? "" : "text-muted-foreground line-through"}
                  onClick={() => {
                    setEditingServiceId(service.id);
                    setEditingServiceName(service.name);
                  }}
                >
                  {service.name}
                </button>
              )
            }
            // Desactivar es reversible y Eliminar no: mismo peso de texto no
            // alcanzaba para distinguirlas. Ghost para lo reversible, danger
            // (tinte, no relleno sólido) para lo que borra de verdad.
            action={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <BrandButton variant="ghost" size="sm" onClick={() => toggleServiceActive(service)}>
                  {service.active ? "Desactivar" : "Activar"}
                </BrandButton>
                {confirmDeleteServiceId === service.id ? (
                  <>
                    <Caption className="text-xs">¿Eliminar?</Caption>
                    <BrandButton variant="danger" size="sm" onClick={() => deleteService(service.id)}>
                      Sí
                    </BrandButton>
                    <BrandButton variant="ghost" size="sm" onClick={() => setConfirmDeleteServiceId(null)}>
                      No
                    </BrandButton>
                  </>
                ) : (
                  <BrandButton variant="danger" size="sm" onClick={() => setConfirmDeleteServiceId(service.id)}>
                    Eliminar
                  </BrandButton>
                )}
              </div>
            }
          >
            <div className="flex flex-wrap items-start gap-4">
              <ImageUploader
                pathPrefix={`services/${params.slug}`}
                currentUrl={service.imageUrl}
                onUploaded={(url) => saveServiceImage(service.id, url)}
              />

              <div className="flex flex-1 flex-col gap-3">
                <ul className="flex flex-col gap-2">
                  {service.variants.map((variant) => (
                    <li key={variant.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className={`w-16 ${variant.active ? "" : "text-muted-foreground line-through"}`}>
                        {NAIL_LENGTHS.find((n) => n.value === variant.nailLength)?.label}
                      </span>
                      <span className="flex items-center gap-1">
                        <Caption className="text-xs">$</Caption>
                        <Input
                          type="number"
                          min={1}
                          defaultValue={variant.priceClp}
                          onBlur={(e) => {
                            const value = Number(e.target.value);
                            if (value !== variant.priceClp) updateVariantPrice(variant.id, value);
                          }}
                          className="w-24"
                        />
                      </span>
                      <span className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={1}
                          defaultValue={variant.durationMinutes}
                          onBlur={(e) => {
                            const value = Number(e.target.value);
                            if (value !== variant.durationMinutes) updateVariantDuration(variant.id, value);
                          }}
                          className="w-20"
                        />
                        <Caption className="text-xs">min</Caption>
                      </span>
                      <BrandButton variant="ghost" size="sm" onClick={() => toggleVariantActive(variant)}>
                        {variant.active ? "Desactivar" : "Activar"}
                      </BrandButton>
                      {confirmDeleteVariantId === variant.id ? (
                        <>
                          <Caption className="text-xs">¿Eliminar?</Caption>
                          <BrandButton variant="danger" size="sm" onClick={() => deleteVariant(variant.id)}>
                            Sí
                          </BrandButton>
                          <BrandButton variant="ghost" size="sm" onClick={() => setConfirmDeleteVariantId(null)}>
                            No
                          </BrandButton>
                        </>
                      ) : (
                        <BrandButton variant="danger" size="sm" onClick={() => setConfirmDeleteVariantId(variant.id)}>
                          Eliminar
                        </BrandButton>
                      )}
                    </li>
                  ))}
                </ul>

                {variantForm?.serviceId === service.id ? (
                  <form onSubmit={createVariant} className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`nail-length-${service.id}`}>Largo</Label>
                      <select
                        id={`nail-length-${service.id}`}
                        value={variantForm.nailLength}
                        onChange={(e) => setVariantForm({ ...variantForm, nailLength: e.target.value as NailLength })}
                        className="h-8 rounded-lg border border-outline-variant bg-background px-2 text-sm"
                      >
                        {NAIL_LENGTHS.map((n) => (
                          <option key={n.value} value={n.value}>
                            {n.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`price-${service.id}`}>Precio (CLP)</Label>
                      <Input
                        id={`price-${service.id}`}
                        type="number"
                        min={1}
                        value={variantForm.priceClp}
                        onChange={(e) => setVariantForm({ ...variantForm, priceClp: Number(e.target.value) })}
                        className="w-28"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`duration-${service.id}`}>Minutos</Label>
                      <Input
                        id={`duration-${service.id}`}
                        type="number"
                        min={1}
                        value={variantForm.durationMinutes}
                        onChange={(e) => setVariantForm({ ...variantForm, durationMinutes: Number(e.target.value) })}
                        className="w-24"
                      />
                    </div>
                    <Button type="submit" size="sm">
                      Agregar
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setVariantForm(null)}>
                      Cancelar
                    </Button>
                  </form>
                ) : (
                  <BrandButton
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => setVariantForm(emptyVariantForm(service.id))}
                  >
                    Agregar variante
                  </BrandButton>
                )}
              </div>
            </div>
          </AdminCard>
        ))}

        {services.length === 0 && <Caption>Todavía no creaste ningún servicio.</Caption>}
      </div>

      {status && <Caption>{status}</Caption>}
    </div>
  );
}
