import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Caption, Overline } from "@/components/brand/typography";

/**
 * Campos de formulario del sistema.
 *
 * El `Input` de shadcn sigue siendo el control denso para las tablas del
 * admin; estos son los campos de 44px de las pantallas de la clienta, donde el
 * objetivo es el pulgar y no la densidad.
 */

export const FIELD_CLASSES =
  "t-body h-11 w-full rounded-lg border border-outline-variant bg-background px-4 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50";

export function TextField({
  label,
  hint,
  error,
  className,
  ...props
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
} & ComponentProps<"input">) {
  return (
    <label className={cn("flex flex-col gap-2", className)}>
      <Overline>{label}</Overline>
      <input {...props} aria-invalid={error ? true : undefined} className={cn(FIELD_CLASSES, error && "border-destructive")} />
      {error ? <span className="text-sm text-destructive">{error}</span> : hint ? <Caption className="text-xs">{hint}</Caption> : null}
    </label>
  );
}

/**
 * Formulario centrado de una columna: login, registro, recuperación. Ancho
 * corto a propósito — una columna angosta se lee como un trámite breve.
 */
export function AuthCard({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-5 py-16", className)}>
      <div className="flex flex-col gap-2">
        <h1 className="t-display">{title}</h1>
        {description && <Caption>{description}</Caption>}
      </div>
      {children}
      {footer && <div className="flex justify-center">{footer}</div>}
    </div>
  );
}
