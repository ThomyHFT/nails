"use client";

import { Check, Star } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Controles de selección del flujo de reserva y del diseñador de uñas.
 *
 * Los tres comparten la misma gramática de los mockups: forma de píldora,
 * estado activo en primary sólido con texto invertido, y estado deshabilitado
 * al 35% con tachado en vez de desaparecer (la clienta necesita ver que ese
 * horario existe pero está tomado).
 */

export function SelectChip({
  children,
  selected,
  disabled,
  onSelect,
  className,
  strikeWhenDisabled = false,
}: {
  children: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  className?: string;
  strikeWhenDisabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "inline-flex items-center justify-center rounded-pill border px-4 py-2 text-sm font-medium transition-all duration-150 [transition-timing-function:var(--ease-brand)] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-e1"
          : "border-outline-variant bg-card text-foreground hover:border-outline hover:bg-surface-2",
        disabled && "pointer-events-none opacity-35",
        disabled && strikeWhenDisabled && "line-through",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Muestra de color del diseñador. El check invertido sobre el propio color es
 * lo que hace legible la selección sin depender de un borde fino.
 */
export function Swatch({
  color,
  selected,
  onSelect,
  label,
  empty,
  className,
}: {
  color: string;
  selected?: boolean;
  onSelect?: () => void;
  label: string;
  empty?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      title={label}
      className={cn(
        "relative size-11 rounded-full border transition-transform duration-200 [transition-timing-function:var(--ease-brand)] outline-none hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background" : "border-outline-variant",
        className,
      )}
      style={empty ? undefined : { background: color }}
    >
      {empty && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-px w-7 rotate-45 bg-outline" />
        </span>
      )}
      {selected && !empty && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Check className="size-5 text-white mix-blend-difference" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

/**
 * Segmentado tipo "Forma | Color & Arte" y "Brillante | Mate". Una sola pista
 * tonal con la pastilla activa elevada.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const sizes = { sm: "p-0.5 text-xs", md: "p-1 text-sm" } as const;
  const itemSizes = { sm: "px-3 py-1.5", md: "px-4 py-2" } as const;

  return (
    <div role="tablist" className={cn("inline-flex w-fit self-start rounded-pill bg-surface-3", sizes[size], className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-pill font-medium transition-all duration-200 [transition-timing-function:var(--ease-brand)] outline-none focus-visible:ring-2 focus-visible:ring-ring",
              itemSizes[size],
              active ? "bg-card text-foreground shadow-e1" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Selector de nota de 1 a 5. Es un `radiogroup` real y no cinco botones
 * sueltos: con teclado se recorre con las flechas y el lector de pantalla
 * anuncia "3 de 5", no "estrella, estrella, estrella".
 */
export function RatingInput({
  value,
  onChange,
  name,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  name?: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label="Nota" className={cn("inline-flex items-center gap-1", className)}>
      {name && <input type="hidden" name={name} value={value} />}
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          role="radio"
          aria-checked={value === score}
          aria-label={`${score} de 5`}
          onClick={() => onChange(score)}
          className="rounded-full p-1 transition-transform duration-150 [transition-timing-function:var(--ease-brand)] outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star className={cn("size-7", score <= value ? "fill-accent text-accent" : "text-outline-variant")} />
        </button>
      ))}
    </div>
  );
}

/**
 * Tarjeta seleccionable con vista previa: formas de uña, arquetipos de marca.
 * El check en la esquina evita depender solo del borde para marcar el estado.
 */
export function OptionCard({
  children,
  label,
  selected,
  onSelect,
  className,
}: {
  children?: ReactNode;
  label: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center gap-3 rounded-card border p-4 transition-all duration-200 [transition-timing-function:var(--ease-brand)] outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary-tint shadow-e1"
          : "border-outline-variant bg-card hover:border-outline hover:bg-surface-2",
        className,
      )}
    >
      {selected && (
        <Check className="absolute top-2 right-2 size-4 text-primary" strokeWidth={3} aria-hidden />
      )}
      {children}
      <span className="t-label text-muted-foreground">{label}</span>
    </button>
  );
}
