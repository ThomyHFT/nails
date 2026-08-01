"use client";

import { useState } from "react";

type NailShape = "almond" | "coffin" | "square" | "round" | "stiletto";

export type NailState = {
  baseColorCode: string | null;
  baseColorHex: string | null;
  finish: string | null;
  decorations: string[];
};

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

function Hand({
  mirrored,
  nails,
  selectedIndex,
  offset,
  onSelectNail,
}: {
  mirrored: boolean;
  nails: NailState[];
  selectedIndex: number | null;
  offset: number;
  onSelectNail: (index: number) => void;
}) {
  return (
    <g transform={mirrored ? `translate(${175 + offset}, 20) scale(-1, 1) translate(-175, 0)` : `translate(${offset}, 20)`}>
      {FINGER_X.map((x, i) => {
        const nailIndex = offset === 0 ? i : 5 + i;
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

export function NailDesigner() {
  const [shape, setShape] = useState<NailShape>("almond");
  const [nails, setNails] = useState<NailState[]>(() => Array.from({ length: 10 }, emptyNail));
  const [selectedNailIndex, setSelectedNailIndex] = useState<number | null>(null);

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
          className="rounded-md border px-2 py-1 text-sm"
        >
          {SHAPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <svg viewBox="0 0 350 140" className="w-full max-w-xl">
        <Hand mirrored={false} nails={nails} selectedIndex={selectedNailIndex} offset={0} onSelectNail={setSelectedNailIndex} />
        <Hand mirrored nails={nails} selectedIndex={selectedNailIndex} offset={175} onSelectNail={setSelectedNailIndex} />
      </svg>

      {selectedNailIndex !== null && (
        <p className="text-sm text-muted-foreground">Uña seleccionada: {selectedNailIndex + 1} de 10</p>
      )}
    </div>
  );
}
