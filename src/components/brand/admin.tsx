import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/brand/chip";
import { IconCircle, Panel } from "@/components/brand/surface";
import { Body, Caption, Display, Overline, Price, Title } from "@/components/brand/typography";

/**
 * Piezas del panel de la profesional. Comparten tokens con la vitrina — es el
 * mismo estudio, no dos productos — pero cambian de densidad: acá la pantalla
 * es una herramienta de trabajo y prioriza cuántas citas caben a la vista.
 */

/**
 * Encabezado de página del admin: display a la izquierda, acción principal a
 * la derecha.
 */
export function AdminPageHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="flex flex-col gap-2">
        <Display as="h1">{title}</Display>
        {description && <Body>{description}</Body>}
      </div>
      {action}
    </header>
  );
}

/**
 * Tarjeta con icono y título serif — el bloque "Arquetipo Visual" / "Identidad
 * Visual" de los mockups de marca.
 */
export function AdminCard({
  icon,
  title,
  description,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Panel className={cn("flex flex-col gap-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && <span className="text-primary [&_svg]:size-5">{icon}</span>}
          <Title>{title}</Title>
        </div>
        {action}
      </div>
      {description && <Body className="-mt-2">{description}</Body>}
      {children}
    </Panel>
  );
}

/**
 * Item de la barra lateral. El activo va en píldora tonal, no en color sólido:
 * la navegación no debe competir con el CTA de la página.
 */
export function SidebarItem({
  href,
  icon,
  label,
  active,
  badge,
  tone = "default",
}: {
  href: string;
  icon: ReactNode;
  label: ReactNode;
  active?: boolean;
  badge?: number;
  tone?: "default" | "danger";
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-pill px-4 py-2.5 text-sm font-medium transition-colors duration-200 outline-none [&_svg]:size-5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        tone === "danger"
          ? "text-destructive hover:bg-destructive-tint"
          : active
            ? "bg-surface-3 text-primary"
            : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="inline-flex min-w-5 items-center justify-center rounded-pill bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}

/**
 * Fila de cita del resumen del día: franja horaria, estado, miniatura del
 * trabajo, clienta y precio.
 */
export function AppointmentRow({
  timeRange,
  status,
  statusTone = "success",
  serviceName,
  clientName,
  priceClp,
  imageUrl,
  href,
  className,
}: {
  timeRange: ReactNode;
  status: ReactNode;
  statusTone?: "success" | "warning" | "danger" | "neutral";
  serviceName: ReactNode;
  clientName?: ReactNode;
  priceClp: number;
  imageUrl?: string | null;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <Chip tone="neutral" className="t-price text-xs">
          {timeRange}
        </Chip>
        <Chip tone={statusTone} className="t-label">
          {status}
        </Chip>
      </div>
      <div className="flex items-center gap-3">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URLs de Vercel Blob, dominio variable
          <img src={imageUrl} alt="" className="size-11 shrink-0 rounded-lg border border-outline-variant object-cover" />
        ) : null}
        <div className="flex flex-col gap-0.5">
          <span className="t-body font-medium">{serviceName}</span>
          {clientName && <Caption>{clientName}</Caption>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-outline-variant pt-3">
        <Price clp={priceClp} size="sm" />
        {href && <ChevronRight className="size-4 text-muted-foreground" aria-hidden />}
      </div>
    </>
  );

  const classes = cn(
    "flex flex-col gap-3 rounded-card border border-outline-variant bg-card p-4 transition-shadow duration-200 outline-none",
    href && "hover:shadow-e1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    className,
  );

  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <article className={classes}>{body}</article>
  );
}

/**
 * Métrica del dashboard: valor grande, etiqueta en versalitas y variación
 * opcional.
 */
export function StatCard({
  icon,
  label,
  value,
  hint,
  className,
}: {
  icon?: ReactNode;
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <Panel padding="sm" className={cn("flex items-center gap-4", className)}>
      {icon && (
        <IconCircle size="md" tone="primary">
          {icon}
        </IconCircle>
      )}
      <div className="flex flex-col gap-0.5">
        <Overline>{label}</Overline>
        {/* La cifra va en la familia de cuerpo, no en la de titular: un "0" en
            Cormorant o Playfair a este tamaño se lee como una "o" minúscula. */}
        <span className="text-2xl leading-tight font-semibold tabular-nums">{value}</span>
        {hint && <Caption className="text-xs">{hint}</Caption>}
      </div>
    </Panel>
  );
}

/**
 * Panel lateral del admin (resumen del día).
 */
export function AdminAside({
  title,
  subtitle,
  sectionLabel,
  sectionAction,
  children,
  footer,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  sectionLabel?: ReactNode;
  sectionAction?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn("flex w-full flex-col gap-5 border-outline-variant bg-surface-1 p-5 lg:w-80 lg:border-l", className)}
    >
      <div className="flex flex-col gap-1">
        <Title>{title}</Title>
        {subtitle && <Caption>{subtitle}</Caption>}
      </div>
      {(sectionLabel || sectionAction) && (
        <div className="flex items-center justify-between gap-3">
          <Overline>{sectionLabel}</Overline>
          {sectionAction}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3">{children}</div>
      {footer}
    </aside>
  );
}
