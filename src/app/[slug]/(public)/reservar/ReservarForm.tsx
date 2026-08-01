"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, ArrowRight, Banknote, CalendarDays, Sparkles } from "lucide-react";
import {
  BookingSummaryCard,
  BrandButton,
  Caption,
  Chip,
  Container,
  Display,
  InfoNote,
  Overline,
  Panel,
  Price,
  SelectChip,
  StickyActionBar,
  SummaryRow,
  Title,
} from "@/components/brand";
import { NailDesigner, type NailDesignerResult } from "@/app/[slug]/(public)/reservar/NailDesigner";

export type VariantOption = {
  id: string;
  nailLength: string;
  priceClp: number;
  durationMinutes: number;
};

export type ServiceOption = {
  id: string;
  name: string;
  variants: VariantOption[];
};

type Slot = { startsAt: string; endsAt: string };
type Step = "select" | "design" | "schedule";

const NAIL_LENGTH_LABELS: Record<string, string> = {
  short: "Corta",
  medium: "Media",
  long: "Larga",
  single: "Única",
};

const STEPS: { id: Step; label: string }[] = [
  { id: "select", label: "Servicio" },
  { id: "design", label: "Diseño" },
  { id: "schedule", label: "Fecha y hora" },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function formatDayChip(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Barra de progreso de los tres pasos. Da contexto de dónde estoy y cuánto falta. */
function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step.id} className="flex flex-1 flex-col gap-1.5">
            <span
              className={
                done || active
                  ? "h-1 rounded-pill bg-primary"
                  : "h-1 rounded-pill bg-surface-3"
              }
            />
            <span className={active ? "t-label text-primary" : "t-label text-muted-foreground"}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function ReservarForm({
  slug,
  services,
  initialServiceId,
  initialVariantId,
}: {
  slug: string;
  services: ServiceOption[];
  initialServiceId?: string;
  initialVariantId?: string;
}) {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [step, setStep] = useState<Step>("select");

  function goToDesignStep() {
    if (sessionStatus !== "authenticated") {
      router.push(`/${slug}/login`);
      return;
    }
    setStep("design");
  }

  const [serviceId, setServiceId] = useState(initialServiceId ?? services[0]?.id ?? "");
  const service = services.find((s) => s.id === serviceId);
  const [variantId, setVariantId] = useState(initialVariantId ?? service?.variants[0]?.id ?? "");

  const [daysWithSlots, setDaysWithSlots] = useState<string[]>([]);
  const [isLoadingDays, setIsLoadingDays] = useState(false);

  const [design, setDesign] = useState<NailDesignerResult | null>(null);

  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  async function loadDaysWithSlots(nextVariantId: string) {
    if (!nextVariantId) return;
    setIsLoadingDays(true);
    try {
      const response = await fetch(
        `/api/availability/days?slug=${slug}&serviceVariantId=${nextVariantId}&month=${currentMonth()}`,
      );
      const data = await response.json();
      setDaysWithSlots(data.days ?? []);
    } finally {
      setIsLoadingDays(false);
    }
  }

  async function loadSlots(nextDate: string) {
    if (!nextDate || !variantId) return;
    setIsLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const extraMinutes = design?.quote.extraMinutes ?? 0;
      const response = await fetch(
        `/api/bookings?slug=${slug}&serviceVariantId=${variantId}&date=${nextDate}&extraMinutes=${extraMinutes}`,
      );
      const data = await response.json();
      setSlots(data.slots ?? []);
    } finally {
      setIsLoadingSlots(false);
    }
  }

  async function confirmBooking() {
    if (!selectedSlot || !variantId) return;
    setStatus(null);
    setIsConfirming(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          serviceVariantId: variantId,
          date,
          startsAt: selectedSlot.startsAt,
          design: design
            ? {
                payload: design.payload,
                expectedExtraPriceClp: design.quote.extraPriceClp,
                expectedExtraMinutes: design.quote.extraMinutes,
                referenceImageUrl: design.referenceImageUrl,
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setStatus(typeof data.error === "string" ? data.error : "No se pudo confirmar la reserva.");
        return;
      }

      router.push(`/${slug}/cuenta`);
    } finally {
      setIsConfirming(false);
    }
  }

  const variant = service?.variants.find((v) => v.id === variantId) ?? null;
  const totalPriceClp = (variant?.priceClp ?? 0) + (design?.quote.extraPriceClp ?? 0);
  const totalMinutes = (variant?.durationMinutes ?? 0) + (design?.quote.extraMinutes ?? 0);

  if (step === "select") {
    return (
      <Container size="md" className="flex flex-col gap-8 px-5 py-10">
        <div className="flex flex-col gap-5">
          <Display as="h1">Reservar hora</Display>
          <StepIndicator current="select" />
        </div>

        {/* El rótulo no repite "Servicio" del indicador de pasos: dos veces la
            misma palabra en la misma pantalla se lee como un error. */}
        <div className="flex flex-col gap-3">
          <Overline>Elige tu servicio</Overline>
          <div className="flex flex-col gap-2">
            {services.map((option) => {
              const selected = option.id === serviceId;
              const cheapest = option.variants.length
                ? Math.min(...option.variants.map((v) => v.priceClp))
                : null;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setServiceId(option.id);
                    const nextVariantId = option.variants[0]?.id ?? "";
                    setVariantId(nextVariantId);
                    setDaysWithSlots([]);
                    loadDaysWithSlots(nextVariantId);
                  }}
                  className={
                    selected
                      ? "flex items-center justify-between gap-3 rounded-card border border-primary bg-primary-tint px-4 py-3 text-left transition-all"
                      : "flex items-center justify-between gap-3 rounded-card border border-outline-variant bg-card px-4 py-3 text-left transition-all hover:border-outline hover:bg-surface-2"
                  }
                >
                  <span className="font-medium">{option.name}</span>
                  {cheapest !== null && <Price clp={cheapest} prefix="Desde" size="sm" />}
                </button>
              );
            })}
          </div>
        </div>

        {service && service.variants.length > 0 && (
          <div className="flex flex-col gap-3">
            <Overline>Largo</Overline>
            <div className="flex flex-wrap gap-2">
              {service.variants.map((v) => (
                <SelectChip
                  key={v.id}
                  selected={v.id === variantId}
                  onSelect={() => {
                    setVariantId(v.id);
                    loadDaysWithSlots(v.id);
                  }}
                >
                  {NAIL_LENGTH_LABELS[v.nailLength] ?? v.nailLength} · ${v.priceClp.toLocaleString("es-CL")} ·{" "}
                  {v.durationMinutes} min
                </SelectChip>
              ))}
            </div>
          </div>
        )}

        <Panel className="flex flex-col gap-3">
          <Title>Días con cupo este mes</Title>
          <Caption>
            El horario final depende del diseño que elijas: algunos horarios de estos días pueden desaparecer al sumar
            los minutos extra.
          </Caption>
          {isLoadingDays && <Caption>Cargando…</Caption>}
          {!isLoadingDays && daysWithSlots.length === 0 && (
            <Caption>No hay días con cupo este mes todavía.</Caption>
          )}
          {!isLoadingDays && daysWithSlots.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {daysWithSlots.map((d) => (
                <Chip key={d}>{formatDayChip(d)}</Chip>
              ))}
            </div>
          )}
        </Panel>

        <BrandButton
          size="lg"
          disabled={!variantId}
          onClick={goToDesignStep}
          icon={<ArrowRight className="size-4" />}
        >
          Continuar
        </BrandButton>
      </Container>
    );
  }

  if (step === "design") {
    return (
      <Container size="md" className="flex flex-col gap-8 px-5 py-10">
        <div className="flex flex-col gap-5">
          <Display as="h1">Diseña tus uñas</Display>
          <StepIndicator current="design" />
        </div>

        <NailDesigner slug={slug} onChange={setDesign} />

        <div className="flex flex-col gap-3 sm:flex-row">
          <BrandButton
            variant="outline"
            size="lg"
            fullWidth
            onClick={() => {
              setDesign(null);
              setStep("schedule");
            }}
          >
            Reservar sin diseño
          </BrandButton>
          <BrandButton
            size="lg"
            fullWidth
            disabled={!design}
            onClick={() => setStep("schedule")}
            icon={<Sparkles className="size-4" />}
            iconPosition="start"
          >
            Continuar con este diseño
          </BrandButton>
        </div>
      </Container>
    );
  }

  return (
    <Container size="md" className="flex flex-col">
      <div className="flex flex-col gap-8 px-5 py-10">
        <div className="flex flex-col gap-5">
          <BrandButton
            variant="ghost"
            size="sm"
            className="-ml-4 self-start"
            onClick={() => setStep("design")}
            icon={<ArrowLeft className="size-4" />}
            iconPosition="start"
          >
            Editar diseño
          </BrandButton>
          <Display as="h1">Casi listo, elige la hora.</Display>
          <StepIndicator current="schedule" />
        </div>

        <label className="flex flex-col gap-2">
          <Overline>Fecha</Overline>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              loadSlots(e.target.value);
            }}
            className="t-body h-11 w-full rounded-lg border border-outline-variant bg-background px-4 text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </label>

        {isLoadingSlots && <Caption>Cargando horarios…</Caption>}

        {!isLoadingSlots && date && slots.length === 0 && (
          <InfoNote tone="warning">
            No hay horarios disponibles para esta fecha
            {design ? ` considerando los ${design.quote.extraMinutes} minutos extra del diseño` : ""}. Puedes elegir
            otro día{design ? " o volver a editar el diseño" : ""}.
          </InfoNote>
        )}

        {slots.length > 0 && (
          <div className="flex flex-col gap-3">
            <Overline>Horarios disponibles</Overline>
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <SelectChip
                  key={slot.startsAt}
                  selected={selectedSlot?.startsAt === slot.startsAt}
                  onSelect={() => setSelectedSlot(slot)}
                >
                  {formatTime(slot.startsAt)}
                </SelectChip>
              ))}
            </div>
          </div>
        )}

        {selectedSlot && (
          <div className="flex flex-col gap-4">
            <Overline>Resumen</Overline>

            <BookingSummaryCard
              serviceName={service?.name ?? "Servicio"}
              variantLabel={
                variant
                  ? `Largo ${NAIL_LENGTH_LABELS[variant.nailLength] ?? variant.nailLength} · ${totalMinutes} min`
                  : undefined
              }
              priceClp={totalPriceClp}
              attributes={
                design ? (
                  <>
                    <Chip tone="primary">Diseño personalizado</Chip>
                    <Chip>+${design.quote.extraPriceClp.toLocaleString("es-CL")}</Chip>
                    <Chip>+{design.quote.extraMinutes} min</Chip>
                  </>
                ) : (
                  <Chip>Sin diseño</Chip>
                )
              }
            />

            <div className="flex flex-col gap-2">
              <SummaryRow
                highlighted
                icon={<CalendarDays className="size-5" />}
                title={`${new Date(`${date}T00:00:00`).toLocaleDateString("es-CL", { dateStyle: "long" })}, ${formatTime(selectedSlot.startsAt)}`}
                detail="America/Santiago"
              />
              <SummaryRow
                icon={<Banknote className="size-5" />}
                title="Pago presencial"
                detail="Se abona en el local al terminar el servicio."
              />
            </div>
          </div>
        )}

        {status && <p className="text-sm text-destructive">{status}</p>}
      </div>

      {/* La barra vive fuera del bloque con padding para pegarse al borde de la
          pantalla, que es donde el pulgar la espera en móvil. */}
      <StickyActionBar
        totalClp={totalPriceClp}
        detail={design ? `Incluye +$${design.quote.extraPriceClp.toLocaleString("es-CL")} de diseño` : undefined}
        action={
          <BrandButton
            size="lg"
            disabled={!selectedSlot || isConfirming}
            onClick={confirmBooking}
            icon={<ArrowRight className="size-4" />}
          >
            {isConfirming ? "Confirmando…" : "Confirmar"}
          </BrandButton>
        }
      />
    </Container>
  );
}
