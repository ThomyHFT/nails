import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconCircle, Panel } from "@/components/brand/surface";
import { Caption, Overline, Price } from "@/components/brand/typography";

/**
 * Piezas del flujo de reserva: resumen de la cita, avisos y la barra fija con
 * el total. Todas presentacionales — la lógica de slots y precios sigue en el
 * caso de uso.
 */

/**
 * Fila de resumen con icono circular, como en la pantalla de confirmación:
 * fecha y hora arriba, forma de pago abajo.
 */
export function SummaryRow({
  icon,
  title,
  detail,
  highlighted = false,
  className,
}: {
  icon: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  highlighted?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-card p-4",
        highlighted && "bg-surface-2",
        className,
      )}
    >
      <IconCircle size="md" tone={highlighted ? "primary" : "surface"}>
        {icon}
      </IconCircle>
      <div className="flex flex-col gap-0.5">
        <span className="t-body font-medium">{title}</span>
        {detail && <Caption>{detail}</Caption>}
      </div>
    </div>
  );
}

/**
 * Aviso informativo de baja intensidad. Se usa para la advertencia de que el
 * horario puede variar según la complejidad del diseño.
 */
export function InfoNote({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "warning";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-card p-4 text-sm",
        tone === "warning" ? "bg-warning-tint text-on-warning-tint" : "bg-surface-3 text-muted-foreground",
        className,
      )}
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="text-pretty">{children}</span>
    </div>
  );
}

/**
 * Barra fija inferior con el total y la acción principal. En los mockups del
 * diseñador es lo único que queda anclado mientras el resto scrollea; el
 * `safe-area` evita que el gesto de home de iOS se coma el botón.
 */
export function StickyActionBar({
  totalClp,
  totalLabel = "Total",
  detail,
  action,
  className,
}: {
  totalClp: number;
  totalLabel?: ReactNode;
  detail?: ReactNode;
  action: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 flex items-center justify-between gap-4 border-t border-outline-variant bg-card/95 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur",
        className,
      )}
    >
      <div className="flex flex-col gap-0.5">
        <Overline>{totalLabel}</Overline>
        <Price clp={totalClp} size="lg" />
        {detail && <Caption className="text-xs">{detail}</Caption>}
      </div>
      {action}
    </div>
  );
}

/**
 * Tarjeta de la reserva en curso: miniatura, servicio, atributos elegidos y
 * precio congelado.
 */
export function BookingSummaryCard({
  imageUrl,
  serviceName,
  variantLabel,
  attributes,
  priceClp,
  className,
}: {
  imageUrl?: string | null;
  serviceName: ReactNode;
  variantLabel?: ReactNode;
  attributes?: ReactNode;
  priceClp: number;
  className?: string;
}) {
  return (
    <Panel padding="sm" className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-start gap-4">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URLs de Vercel Blob, dominio variable
          <img src={imageUrl} alt="" className="size-16 shrink-0 rounded-lg border border-outline-variant object-cover" />
        ) : null}
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <span className="t-title">{serviceName}</span>
            <Price clp={priceClp} size="md" className="text-primary" />
          </div>
          {variantLabel && <Caption>{variantLabel}</Caption>}
          {attributes && <div className="mt-1 flex flex-wrap gap-2">{attributes}</div>}
        </div>
      </div>
    </Panel>
  );
}

/**
 * Campo de texto largo con la tipografía del sistema. El `Input` de shadcn
 * cubre los formularios densos del admin; esto es para la nota a la
 * profesional, que en los mockups es un bloque generoso.
 */
export function NoteField({
  label,
  placeholder,
  name,
  defaultValue,
  rows = 4,
  className,
}: {
  label: ReactNode;
  placeholder?: string;
  name?: string;
  defaultValue?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-2", className)}>
      <span className="t-caption font-medium">{label}</span>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="t-body w-full resize-y rounded-card border border-outline-variant bg-card px-4 py-3 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
      />
    </label>
  );
}
