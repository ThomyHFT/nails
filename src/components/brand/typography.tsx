import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Roles tipográficos del sistema. Envuelven las clases `.t-*` de globals.css
 * para que las páginas nombren jerarquía ("esto es un display") en vez de
 * tamaños ("esto es text-3xl"), que es justo lo que se descalibra al crecer.
 */

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";

type TextProps = {
  children: ReactNode;
  className?: string;
  as?: HeadingLevel;
};

export function Display({ children, className, as: Tag = "h1" }: TextProps) {
  return <Tag className={cn("t-display text-balance", className)}>{children}</Tag>;
}

export function Headline({ children, className, as: Tag = "h2" }: TextProps) {
  return <Tag className={cn("t-headline text-balance", className)}>{children}</Tag>;
}

export function Title({ children, className, as: Tag = "h3" }: TextProps) {
  return <Tag className={cn("t-title", className)}>{children}</Tag>;
}

export function Body({ children, className, as: Tag = "p" }: TextProps) {
  return <Tag className={cn("t-body text-muted-foreground text-pretty", className)}>{children}</Tag>;
}

export function BodyLarge({ children, className, as: Tag = "p" }: TextProps) {
  return <Tag className={cn("t-body-lg text-muted-foreground text-pretty", className)}>{children}</Tag>;
}

export function Caption({ children, className, as: Tag = "p" }: TextProps) {
  return <Tag className={cn("t-caption text-muted-foreground", className)}>{children}</Tag>;
}

export function Overline({ children, className, as: Tag = "span" }: TextProps) {
  return <Tag className={cn("t-label text-muted-foreground", className)}>{children}</Tag>;
}

/**
 * Chip de versalitas sobre el título del hero. En los mockups es lo que ancla
 * el nombre del estudio antes del titular editorial.
 */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "t-label inline-flex items-center gap-2 rounded-pill bg-surface-3 px-4 py-1.5 text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Precio en CLP. Formato `$XX.XXX` con cifras tabulares: la localización
 * chilena del sistema vive acá y no repartida por cada página.
 */
export function Price({
  clp,
  className,
  prefix,
  size = "md",
}: {
  clp: number;
  className?: string;
  prefix?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "t-headline",
  } as const;

  return (
    <span className={cn("t-price inline-flex items-baseline gap-1.5", sizes[size], className)}>
      {prefix && <span className="t-label font-medium text-muted-foreground">{prefix}</span>}
      <span>${clp.toLocaleString("es-CL")}</span>
    </span>
  );
}

/**
 * Encabezado de sección: headline + bajada opcional, centrado o alineado.
 * Los mockups centran en la vitrina pública y alinean a la izquierda en admin.
 */
export function SectionHeading({
  title,
  subtitle,
  align = "center",
  eyebrow,
  className,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "start";
  eyebrow?: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "flex gap-4",
        centered ? "flex-col items-center text-center" : "flex-row items-end justify-between",
        className,
      )}
    >
      <div className={cn("flex flex-col gap-2", centered && "items-center")}>
        {eyebrow && <Overline>{eyebrow}</Overline>}
        <Headline>{title}</Headline>
        {subtitle && <Body className={cn(centered && "max-w-2xl")}>{subtitle}</Body>}
      </div>
      {action}
    </div>
  );
}
