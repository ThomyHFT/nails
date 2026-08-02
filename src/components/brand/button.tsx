import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Botón de marca. Es deliberadamente distinto al `Button` de shadcn: aquel es
 * un control denso de 32px para formularios de admin, este es el CTA de 52px en
 * versalitas que los mockups usan como pieza principal de la vitrina.
 *
 * Renderiza `<button>`, `<a>` o `<Link>` según reciba `href`, para que
 * "Reservar hora" se vea idéntico sea navegación o submit.
 */

type BrandButtonVariant = "primary" | "outline" | "ghost" | "accent" | "danger";
type BrandButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<BrandButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-e1 hover:bg-[var(--primary-hover)]",
  outline: "border border-outline text-primary hover:bg-surface-2",
  ghost: "text-primary hover:bg-surface-2",
  accent: "bg-accent text-accent-foreground shadow-e1 hover:brightness-95",
  // Destructivo en tinte, no en relleno sólido: cancelar es reversible y no
  // merece el peso visual de la acción principal de la pantalla.
  danger: "bg-destructive-tint text-destructive hover:brightness-95",
};

const SIZES: Record<BrandButtonSize, string> = {
  sm: "h-9 gap-1.5 px-4 text-[0.75rem]",
  md: "h-11 gap-2 px-6",
  lg: "h-13 gap-2 px-8",
};

const BASE =
  "t-label inline-flex items-center justify-center rounded-lg transition-all duration-200 [transition-timing-function:var(--ease-brand)] outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0";

type CommonProps = {
  children: ReactNode;
  variant?: BrandButtonVariant;
  size?: BrandButtonSize;
  fullWidth?: boolean;
  className?: string;
  icon?: ReactNode;
  iconPosition?: "start" | "end";
};

function content({ children, icon, iconPosition }: Pick<CommonProps, "children" | "icon" | "iconPosition">) {
  if (!icon) return children;
  return iconPosition === "start" ? (
    <>
      {icon}
      {children}
    </>
  ) : (
    <>
      {children}
      {icon}
    </>
  );
}

export function BrandButton({
  children,
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  icon,
  iconPosition = "end",
  href,
  ...props
}: CommonProps &
  Omit<ComponentProps<"button">, "children" | "className"> & {
    href?: string;
  }) {
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className);
  const inner = content({ children, icon, iconPosition });

  if (href) {
    const external = href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:");
    if (external) {
      return (
        <a href={href} target="_blank" rel="noreferrer" className={classes}>
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {inner}
    </button>
  );
}

/**
 * Botón circular de flecha. En las tarjetas de servicio del arquetipo Glam
 * reemplaza al texto "Reservar" y carga toda la afordancia de la tarjeta.
 */
export function CircleButton({
  children,
  href,
  label,
  variant = "outline",
  className,
  ...props
}: {
  children: ReactNode;
  href?: string;
  label: string;
  variant?: "primary" | "outline" | "accent";
  className?: string;
} & Omit<ComponentProps<"button">, "children" | "className">) {
  const tones = {
    primary: "bg-primary text-primary-foreground",
    outline: "border border-outline text-primary hover:bg-surface-2",
    accent: "border border-accent text-accent hover:bg-accent-tint",
  } as const;

  const classes = cn(
    "inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-transform duration-200 [transition-timing-function:var(--ease-brand)] hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none",
    tones[variant],
    className,
  );

  if (href) {
    return (
      <Link href={href} aria-label={label} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button aria-label={label} className={classes} {...props}>
      {children}
    </button>
  );
}

/**
 * Enlace de acción en versalitas con flecha ("VER CATÁLOGO COMPLETO →").
 */
export function ActionLink({
  children,
  href,
  className,
  icon,
}: {
  children: ReactNode;
  href: string;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "t-label group inline-flex items-center gap-2 rounded-sm text-primary outline-none transition-colors hover:text-[var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      {children}
      <span className="transition-transform duration-200 group-hover:translate-x-0.5">{icon ?? "→"}</span>
    </Link>
  );
}
