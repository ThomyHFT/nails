import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Etiquetas estáticas. Píldora en todos los arquetipos: es la forma que Stitch
 * mantiene constante aunque el resto del sistema cambie de esquinas.
 */

type ChipTone = "neutral" | "primary" | "accent" | "success" | "warning" | "danger";

const TONES: Record<ChipTone, string> = {
  neutral: "bg-surface-3 text-muted-foreground",
  primary: "bg-primary-tint text-primary",
  accent: "bg-accent-tint text-accent-foreground",
  success: "bg-success-tint text-on-success-tint",
  warning: "bg-warning-tint text-on-warning-tint",
  danger: "bg-destructive-tint text-destructive",
};

export function Chip({
  children,
  tone = "neutral",
  className,
  icon,
}: {
  children: ReactNode;
  tone?: ChipTone;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-sm font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/**
 * Estado de una reserva. Versalitas y tinte de baja saturación, como pide el
 * sistema: "CONFIRMADA" en verde suave, nunca en verde semáforo.
 */
export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: ChipTone;
  className?: string;
}) {
  return (
    <span className={cn("t-label inline-flex items-center rounded-pill px-2.5 py-1", TONES[tone], className)}>
      {children}
    </span>
  );
}

/**
 * Dato con icono: duración, horario, ubicación. El par icono + texto se repite
 * en tarjetas de servicio, resumen de reserva y listado del admin.
 */
export function MetaItem({
  icon,
  children,
  className,
}: {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <span className="[&_svg]:size-4">{icon}</span>
      {children}
    </span>
  );
}
