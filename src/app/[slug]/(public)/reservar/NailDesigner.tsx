"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateDesignQuote, type DesignQuote } from "@/server/domain/design/calculate-design-quote";
import type { DesignElement } from "@/server/domain/design/design-element.entity";
import type { NailDesignPayload } from "@/server/domain/design/nail-design-payload";

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
}

const SHAPES: { value: NailShape; label: string }[] = [
  { value: "almond", label: "Almendra" },
  { value: "coffin", label: "Ataúd" },
  { value: "square", label: "Cuadrada" },
  { value: "round", label: "Redonda" },
  { value: "stiletto", label: "Stiletto" },
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
            <rect x={4} y={16} width={26} height={height - 16} rx={13} className="fill-muted" />
            {/* Área de toque ampliada para cumplir 44px mínimo en mobile */}
            <circle
              cx={17}
              cy={12}
              r={22}
              fill="transparent"
              role="button"
              aria-label={`Uña ${nailIndex + 1}`}
              className="cursor-pointer"
              onClick={() => onSelectNail(nailIndex)}
            />
            <ellipse
              cx={17}
              cy={12}
              rx={15}
              ry={13}
              fill={nail.baseColorHex ?? "#ffffff"}
              stroke={isSelected ? "#111827" : "#9ca3af"}
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
    onChange?.(payload && quote ? { payload, quote } : null);
  }, [payload, quote, onChange]);

  function updateSelectedNail(patch: Partial<NailState>) {
    if (selectedNailIndex === null) return;
    setNails((current) =>
      current.map((nail, index) => (index === selectedNailIndex ? { ...nail, ...patch } : nail)),
    );
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <label htmlFor="nail-shape" className="text-sm font-medium">
          Forma
        </label>
        <select
          id="nail-shape"
          value={shape}
          onChange={(e) => setShape(e.target.value as NailShape)}
          className="px-2 py-1 text-sm"
          style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--background)" }}
        >
          {SHAPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <svg viewBox="0 0 400 140" className="w-full max-w-xl">
        <Hand mirrored={false} nails={nails} selectedIndex={selectedNailIndex} indexBase={0} onSelectNail={setSelectedNailIndex} />
        <Hand mirrored nails={nails} selectedIndex={selectedNailIndex} indexBase={5} onSelectNail={setSelectedNailIndex} />
      </svg>

      {selectedNail && (
        <div
          className="flex flex-col gap-3 p-4"
          style={{ background: "var(--card)", color: "var(--card-foreground)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
        >
          <p className="text-sm font-medium">Uña {(selectedNailIndex as number) + 1} de 10</p>

          <div className="flex items-center gap-3">
            <label htmlFor="nail-color" className="w-24 text-sm">
              Color
            </label>
            <select
              id="nail-color"
              value={selectedNail.baseColorCode ?? ""}
              onChange={(e) => {
                const element = colors.find((c) => c.code === e.target.value);
                updateSelectedNail({
                  baseColorCode: element?.code ?? null,
                  baseColorHex: element?.colorHex ?? null,
                });
              }}
              className="px-2 py-1 text-sm"
              style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--background)" }}
            >
              <option value="">Elegir...</option>
              {colors.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="nail-finish" className="w-24 text-sm">
              Acabado
            </label>
            <select
              id="nail-finish"
              value={selectedNail.finish ?? ""}
              onChange={(e) => updateSelectedNail({ finish: e.target.value || null })}
              className="px-2 py-1 text-sm"
              style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--background)" }}
            >
              <option value="">Elegir...</option>
              {finishes.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm">Decoraciones</span>
            <div className="flex flex-wrap gap-3">
              {decorations.map((d) => (
                <label key={d.code} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedNail.decorations.includes(d.code)}
                    onChange={() => toggleDecoration(d.code)}
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={applyToAll}
            className="w-fit px-3 py-1 text-sm transition-colors"
            style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
          >
            Aplicar a todas
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <label htmlFor="nail-technique" className="text-sm font-medium">
          Técnica
        </label>
        <select
          id="nail-technique"
          value={technique ?? ""}
          onChange={(e) => setTechnique(e.target.value || null)}
          className="px-2 py-1 text-sm"
          style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--background)" }}
        >
          <option value="">Sin técnica</option>
          {techniques.map((t) => (
            <option key={t.code} value={t.code}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div
        className="p-4 text-sm"
        style={{ background: "var(--card)", color: "var(--card-foreground)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
      >
        {quoteError && (
          <p style={{ color: "var(--destructive)" }}>{quoteError}</p>
        )}
        {!quoteError && quote && (
          <p>
            Precio extra: ${quote.extraPriceClp.toLocaleString("es-CL")} · Minutos extra: {quote.extraMinutes}
          </p>
        )}
        {!quoteError && !quote && (
          <p style={{ color: "var(--muted-foreground)" }}>Elegí color y acabado en las 10 uñas para ver el precio.</p>
        )}
      </div>
    </div>
  );
}
