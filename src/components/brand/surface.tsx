import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Contenedores tonales. Toda la profundidad del sistema sale de acá: un nivel
 * de superficie más una hairline, nunca una sombra dura.
 */

type PanelLevel = 0 | 1 | 2 | 3;

const LEVELS: Record<PanelLevel, string> = {
  0: "bg-background",
  1: "bg-card",
  2: "bg-surface-2",
  3: "bg-surface-3",
};

export function Panel({
  children,
  level = 1,
  className,
  bordered = true,
  elevation = "e1",
  padding = "md",
  as: Tag = "div",
}: {
  children: ReactNode;
  level?: PanelLevel;
  className?: string;
  bordered?: boolean;
  elevation?: "none" | "e1" | "e2";
  padding?: "none" | "sm" | "md" | "lg";
  as?: "div" | "section" | "article" | "li";
}) {
  const paddings = { none: "", sm: "p-4", md: "p-6", lg: "p-8" } as const;
  const elevations = { none: "", e1: "shadow-e1", e2: "shadow-e2" } as const;

  return (
    <Tag
      className={cn(
        "rounded-card",
        LEVELS[level],
        bordered && "border border-outline-variant",
        elevations[elevation],
        paddings[padding],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * Banda de sección: el bloque teñido de esquinas grandes que en los mockups
 * separa "Servicios Destacados" del resto de la página.
 */
export function Band({
  children,
  className,
  level = 1,
  id,
}: {
  children: ReactNode;
  className?: string;
  level?: PanelLevel;
  id?: string;
}) {
  return (
    <section id={id} className={cn("rounded-band px-5 py-14 md:px-10 md:py-16", LEVELS[level], className)}>
      {children}
    </section>
  );
}

/**
 * Sección a sangre completa, sin fondo. El ritmo vertical de la vitrina.
 */
export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("px-5 py-12 md:py-16", className)}>
      {children}
    </section>
  );
}

export { MediaFrame } from "@/components/brand/media";

/**
 * Círculo de icono. Aparece en el CTA de WhatsApp, en las filas de resumen de
 * la confirmación y en las tarjetas del admin.
 */
export function IconCircle({
  children,
  size = "md",
  tone = "primary",
  className,
}: {
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  tone?: "primary" | "surface" | "accent";
  className?: string;
}) {
  const sizes = { sm: "size-9", md: "size-12", lg: "size-16" } as const;
  const tones = {
    primary: "bg-primary-tint text-primary",
    surface: "bg-surface-3 text-muted-foreground",
    accent: "bg-accent-tint text-accent-foreground",
  } as const;

  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full", sizes[size], tones[tone], className)}>
      {children}
    </span>
  );
}

/**
 * Contenedor de ancho máximo. Los mockups trabajan a 1280px con márgenes de
 * 20px en móvil.
 */
export function Container({
  children,
  className,
  size = "lg",
}: {
  children: ReactNode;
  className?: string;
  size?: "md" | "lg" | "xl";
}) {
  const sizes = { md: "max-w-3xl", lg: "max-w-5xl", xl: "max-w-7xl" } as const;
  return <div className={cn("mx-auto w-full", sizes[size], className)}>{children}</div>;
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-outline-variant", className)} />;
}
