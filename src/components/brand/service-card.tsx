import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionLink, CircleButton } from "@/components/brand/button";
import { Chip, MetaItem } from "@/components/brand/chip";
import { MediaFrame } from "@/components/brand/surface";
import { Price, Title } from "@/components/brand/typography";

export type ServiceCardData = {
  id: string;
  name: string;
  description?: string | null;
  priceFromClp: number;
  durationMinutes?: number | null;
  imageUrl?: string | null;
};

/**
 * Tarjeta de servicio en sus dos composiciones de Stitch:
 *
 * - `compact`: la del arquetipo Minimal. Título + chip de precio arriba,
 *   descripción al medio, y un pie separado por hairline con duración a la
 *   izquierda y "Reservar →" a la derecha.
 * - `media`: la del arquetipo Glam. Foto del trabajo arriba, precio grande en
 *   el color de acento y botón circular de flecha.
 *
 * La misma data alimenta ambas: el arquetipo elige la composición, no el
 * contenido.
 */
export function ServiceCard({
  service,
  href,
  variant = "compact",
  className,
}: {
  service: ServiceCardData;
  href: string;
  variant?: "compact" | "media";
  className?: string;
}) {
  if (variant === "media") {
    return (
      <article
        className={cn(
          "group flex flex-col overflow-hidden rounded-card border border-outline-variant bg-card shadow-e1 transition-shadow duration-300 hover:shadow-e2",
          className,
        )}
      >
        <MediaFrame src={service.imageUrl} alt={service.name} ratio="wide" rounded="card" className="rounded-b-none border-0 border-b" />
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <Title>{service.name}</Title>
            {service.durationMinutes ? <Chip tone="primary">{service.durationMinutes} min</Chip> : null}
          </div>
          {service.description && <p className="t-caption flex-1 text-muted-foreground">{service.description}</p>}
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="flex flex-col">
              <span className="t-label text-muted-foreground">Desde</span>
              <Price clp={service.priceFromClp} size="lg" className="text-accent" />
            </div>
            <CircleButton href={href} label={`Reservar ${service.name}`} variant="accent">
              <ArrowRight className="size-5" />
            </CircleButton>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group flex flex-col justify-between gap-5 rounded-card border border-outline-variant bg-card p-6 shadow-e1 transition-shadow duration-300 hover:shadow-e2",
        className,
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <Title>{service.name}</Title>
          <Chip tone="neutral" className="t-price">
            ${service.priceFromClp.toLocaleString("es-CL")}
          </Chip>
        </div>
        {service.description && <p className="t-caption text-muted-foreground">{service.description}</p>}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-outline-variant pt-4">
        {service.durationMinutes ? (
          <MetaItem icon={<Clock />}>{service.durationMinutes} min</MetaItem>
        ) : (
          <span />
        )}
        <ActionLink href={href} icon={<ArrowRight className="size-4" />}>
          Reservar
        </ActionLink>
      </div>
    </article>
  );
}

/**
 * Fila de variante (largo · duración · precio) para el catálogo completo, donde
 * un servicio despliega sus tres largos en vez de un "desde".
 */
export function VariantRow({
  label,
  durationMinutes,
  priceClp,
  href,
}: {
  label: string;
  durationMinutes: number;
  priceClp: number;
  href?: string;
}) {
  const inner = (
    <>
      <span className="flex items-center gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">· {durationMinutes} min</span>
      </span>
      <Price clp={priceClp} size="sm" />
    </>
  );

  const classes =
    "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-surface-2";

  return href ? (
    <Link href={href} className={classes}>
      {inner}
    </Link>
  ) : (
    <div className={classes}>{inner}</div>
  );
}
