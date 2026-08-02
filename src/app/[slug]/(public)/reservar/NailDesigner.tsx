"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateDesignQuote, type DesignQuote } from "@/server/domain/design/calculate-design-quote";
import type { DesignElement } from "@/server/domain/design/design-element.entity";
import type { NailDesignPayload } from "@/server/domain/design/nail-design-payload";
import { ImageUploader } from "@/components/ImageUploader";
import {
  BrandButton,
  Caption,
  Chip,
  InfoNote,
  OptionCard,
  Overline,
  Panel,
  SelectChip,
  Swatch,
} from "@/components/brand";

type NailShape = "almond" | "coffin" | "square" | "round" | "stiletto";

export type NailState = {
  baseColorCode: string | null;
  baseColorHex: string | null;
  finish: string | null;
  decorations: string[];
};

export interface NailDesignerResult {
  payload: NailDesignPayload;
  quote: DesignQuote;
  referenceImageUrl: string | null;
}

const SHAPES: { value: NailShape; label: string; radius: string }[] = [
  { value: "almond", label: "Almendra", radius: "45% 45% 6px 6px" },
  { value: "coffin", label: "Ataúd", radius: "30% 30% 10px 10px" },
  { value: "square", label: "Cuadrada", radius: "6px 6px 3px 3px" },
  { value: "round", label: "Redonda", radius: "50% 50% 8px 8px" },
  { value: "stiletto", label: "Stiletto", radius: "50% 50% 2px 2px / 70% 70% 2px 2px" },
];

// Índices 0–4: mano izquierda, del pulgar al meñique. Índices 5–9: mano derecha, del pulgar al meñique.
const FINGER_X = [0, 40, 75, 110, 145];
const FINGER_HEIGHT = [70, 100, 110, 100, 85];

function emptyNail(): NailState {
  return { baseColorCode: null, baseColorHex: null, finish: null, decorations: [] };
}

function buildPayload(shape: NailShape, technique: string | null, nails: NailState[]): NailDesignPayload | null {
  if (nails.some((nail) => !nail.baseColorCode || !nail.baseColorHex || !nail.finish)) {
    return null;
  }

  return {
    version: 2,
    shape,
    technique,
    nails: nails.map((nail) => ({
      baseColorCode: nail.baseColorCode as string,
      baseColorHex: nail.baseColorHex as string,
      finish: nail.finish as string,
      decorations: nail.decorations,
    })),
  };
}

function Hand({
  mirrored,
  nails,
  selectedIndex,
  indexBase,
  onSelectNail,
}: {
  mirrored: boolean;
  nails: NailState[];
  selectedIndex: number | null;
  indexBase: number;
  onSelectNail: (index: number) => void;
}) {
  return (
    <g transform={mirrored ? "translate(390, 20) scale(-1, 1)" : "translate(10, 20)"}>
      {FINGER_X.map((x, i) => {
        const nailIndex = indexBase + i;
        const height = FINGER_HEIGHT[i];
        const nail = nails[nailIndex];
        const isSelected = selectedIndex === nailIndex;

        return (
          <g key={nailIndex} transform={`translate(${x}, ${120 - height})`}>
            {/* Los colores salen de los tokens del tenant: la mano tenía gris
                hardcodeado y se veía ajena en los arquetipos Glam y Pastel. */}
            <rect x={4} y={16} width={26} height={height - 16} rx={13} fill="var(--surface-3)" />
            {/* Área de toque ampliada para cumplir 44px mínimo en mobile */}
            <circle
              cx={17}
              cy={12}
              r={22}
              fill="transparent"
              role="button"
              tabIndex={0}
              aria-label={`Uña ${nailIndex + 1}`}
              aria-pressed={isSelected}
              className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              onClick={() => onSelectNail(nailIndex)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectNail(nailIndex);
                }
              }}
            />
            <ellipse
              cx={17}
              cy={12}
              rx={15}
              ry={13}
              fill={nail.baseColorHex ?? "var(--card)"}
              stroke={isSelected ? "var(--primary)" : "var(--outline-variant)"}
              strokeWidth={isSelected ? 3 : 1}
              className="pointer-events-none"
            />
          </g>
        );
      })}
    </g>
  );
}

export function NailDesigner({
  slug,
  onChange,
}: {
  slug: string;
  onChange?: (result: NailDesignerResult | null) => void;
}) {
  const [catalog, setCatalog] = useState<DesignElement[]>([]);
  const [shape, setShape] = useState<NailShape>("almond");
  const [technique, setTechnique] = useState<string | null>(null);
  const [nails, setNails] = useState<NailState[]>(() => Array.from({ length: 10 }, emptyNail));
  const [selectedNailIndex, setSelectedNailIndex] = useState<number | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/design-elements/public?slug=${slug}`)
      .then((res) => res.json())
      .then((data) => setCatalog(data.elements ?? []));
  }, [slug]);

  const colors = catalog.filter((e) => e.category === "color");
  const finishes = catalog.filter((e) => e.category === "finish");
  const decorations = catalog.filter((e) => e.category === "decoration");
  const techniques = catalog.filter((e) => e.category === "technique");

  const payload = useMemo(() => buildPayload(shape, technique, nails), [shape, technique, nails]);

  const { quote, quoteError } = useMemo(() => {
    if (!payload) return { quote: null as DesignQuote | null, quoteError: null as string | null };
    try {
      return { quote: calculateDesignQuote(payload, catalog), quoteError: null };
    } catch (err) {
      return { quote: null, quoteError: err instanceof Error ? err.message : "No se pudo cotizar el diseño" };
    }
  }, [payload, catalog]);

  useEffect(() => {
    onChange?.(payload && quote ? { payload, quote, referenceImageUrl } : null);
  }, [payload, quote, referenceImageUrl, onChange]);

  function updateSelectedNail(patch: Partial<NailState>) {
    if (selectedNailIndex === null) return;
    setNails((current) => current.map((nail, index) => (index === selectedNailIndex ? { ...nail, ...patch } : nail)));
  }

  function applyToAll() {
    if (selectedNailIndex === null) return;
    const source = nails[selectedNailIndex];
    setNails(() => Array.from({ length: 10 }, () => ({ ...source, decorations: [...source.decorations] })));
  }

  function toggleDecoration(code: string) {
    if (selectedNailIndex === null) return;
    const nail = nails[selectedNailIndex];
    const decorations = nail.decorations.includes(code)
      ? nail.decorations.filter((d) => d !== code)
      : [...nail.decorations, code];
    updateSelectedNail({ decorations });
  }

  const selectedNail = selectedNailIndex !== null ? nails[selectedNailIndex] : null;
  const paintedCount = nails.filter((nail) => nail.baseColorCode && nail.finish).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Lienzo: las manos sobre superficie tonal, como en los mockups del
          diseñador, para que la uña seleccionada tenga contra qué destacar. */}
      <Panel level={2} padding="sm" className="flex flex-col gap-3">
        <svg viewBox="0 0 400 140" className="w-full">
          <Hand
            mirrored={false}
            nails={nails}
            selectedIndex={selectedNailIndex}
            indexBase={0}
            onSelectNail={setSelectedNailIndex}
          />
          <Hand
            mirrored
            nails={nails}
            selectedIndex={selectedNailIndex}
            indexBase={5}
            onSelectNail={setSelectedNailIndex}
          />
        </svg>
        <div className="flex items-center justify-center gap-3">
          <Overline>
            {selectedNailIndex === null
              ? "Toca una uña para empezar"
              : `Uña seleccionada: ${selectedNailIndex + 1} de 10`}
          </Overline>
          <Chip tone={paintedCount === 10 ? "success" : "neutral"}>{paintedCount}/10 listas</Chip>
        </div>
      </Panel>

      <div className="flex flex-col gap-3">
        <Overline>Forma</Overline>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {SHAPES.map((option) => (
            <OptionCard
              key={option.value}
              label={option.label}
              selected={shape === option.value}
              onSelect={() => setShape(option.value)}
            >
              <span
                className="h-12 w-8 border border-outline-variant bg-surface-3"
                style={{ borderRadius: option.radius }}
              />
            </OptionCard>
          ))}
        </div>
      </div>

      {selectedNail && (
        <Panel className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <Overline>Uña {(selectedNailIndex as number) + 1}</Overline>
            <BrandButton size="sm" variant="ghost" onClick={applyToAll}>
              Aplicar a todas
            </BrandButton>
          </div>

          <div className="flex flex-col gap-2">
            <Overline>Color base</Overline>
            <div className="flex flex-wrap gap-3">
              {colors.map((c) => (
                <Swatch
                  key={c.code}
                  color={c.colorHex ?? "var(--surface-3)"}
                  label={c.label}
                  selected={selectedNail.baseColorCode === c.code}
                  onSelect={() =>
                    updateSelectedNail({ baseColorCode: c.code, baseColorHex: c.colorHex ?? null })
                  }
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Overline>Acabado</Overline>
            <div className="flex flex-wrap gap-2">
              {finishes.map((f) => (
                <SelectChip
                  key={f.code}
                  selected={selectedNail.finish === f.code}
                  onSelect={() => updateSelectedNail({ finish: f.code })}
                >
                  {f.label}
                </SelectChip>
              ))}
            </div>
          </div>

          {decorations.length > 0 && (
            <div className="flex flex-col gap-2">
              <Overline>Decoraciones</Overline>
              <div className="flex flex-wrap gap-2">
                {decorations.map((d) => (
                  <SelectChip
                    key={d.code}
                    selected={selectedNail.decorations.includes(d.code)}
                    onSelect={() => toggleDecoration(d.code)}
                  >
                    {d.label}
                  </SelectChip>
                ))}
              </div>
            </div>
          )}
        </Panel>
      )}

      {techniques.length > 0 && (
        <div className="flex flex-col gap-2">
          <Overline>Técnica</Overline>
          <div className="flex flex-wrap gap-2">
            <SelectChip selected={technique === null} onSelect={() => setTechnique(null)}>
              Sin técnica
            </SelectChip>
            {techniques.map((t) => (
              <SelectChip key={t.code} selected={technique === t.code} onSelect={() => setTechnique(t.code)}>
                {t.label}
              </SelectChip>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Overline>Foto de referencia (opcional)</Overline>
        <Caption>Sube una foto de inspiración para que la profesional vea qué quieres antes de la cita.</Caption>
        <ImageUploader
          pathPrefix={`design-references/${slug}`}
          currentUrl={referenceImageUrl}
          clientPayload={JSON.stringify({ purpose: "design-reference" })}
          onUploaded={setReferenceImageUrl}
        />
      </div>

      {quoteError && <InfoNote tone="warning">{quoteError}</InfoNote>}

      {!quoteError && quote && (
        <Panel level={2} padding="sm" className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <Overline>Extra por diseño</Overline>
            <Caption>+{quote.extraMinutes} min de trabajo</Caption>
          </div>
          <span className="t-headline t-price">+${quote.extraPriceClp.toLocaleString("es-CL")}</span>
        </Panel>
      )}

      {!quoteError && !quote && (
        <InfoNote>Elige color y acabado en las 10 uñas para ver cuánto suma el diseño.</InfoNote>
      )}
    </div>
  );
}
