import { Star } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/brand/chip";
import { MediaFrame, Panel } from "@/components/brand/surface";
import { Caption } from "@/components/brand/typography";

/**
 * Piezas de opiniones (SPEC 06).
 *
 * Las estrellas se dibujan con iconos y no con los caracteres `★`/`☆`: el
 * glifo depende de la fuente del tenant, se ve distinto en cada par
 * tipográfico y no hereda el color de marca. Con iconos, la nota se lee igual
 * en los cuatro arquetipos.
 */

const MAX_RATING = 5;

export function RatingStars({
  rating,
  size = "md",
  className,
  showValue = false,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  showValue?: boolean;
}) {
  const sizes = { sm: "size-3.5", md: "size-4", lg: "size-5" } as const;

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      role="img"
      aria-label={`${rating} de ${MAX_RATING} estrellas`}
    >
      <span className="inline-flex items-center gap-0.5">
        {Array.from({ length: MAX_RATING }, (_, index) => (
          <Star
            key={index}
            aria-hidden
            className={cn(sizes[size], index < rating ? "fill-accent text-accent" : "text-outline-variant")}
          />
        ))}
      </span>
      {showValue && <span className="t-price text-sm">{rating.toFixed(1)}</span>}
    </span>
  );
}

/**
 * Nota promedio + cantidad. `null` cuando todavía no hay opiniones aprobadas,
 * así la landing puede omitir la sección completa sin repetir la condición.
 */
export function RatingSummary({
  average,
  count,
  size = "md",
  className,
}: {
  average: number;
  count: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <RatingStars rating={Math.round(average)} size={size} />
      {/* Coma decimal: en Chile "4.5" se lee como cuatro mil quinientos. */}
      <span className="t-price">{average.toFixed(1).replace(".", ",")}</span>
      <Caption className="whitespace-nowrap">
        {count} {count === 1 ? "opinión" : "opiniones"}
      </Caption>
    </span>
  );
}

/**
 * Tarjeta de opinión publicada. La foto es opcional y ocupa una franja propia:
 * la clienta que sube foto está mostrando el trabajo, no ilustrando el texto.
 */
export function ReviewCard({
  rating,
  body,
  authorName,
  authorInstagram,
  date,
  photoUrl,
  action,
  className,
}: {
  rating: number;
  body: string;
  authorName?: string | null;
  authorInstagram?: string | null;
  date?: ReactNode;
  photoUrl?: string | null;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Panel padding="sm" className={cn("flex flex-col gap-3", className)} as="article">
      <div className="flex items-center justify-between gap-3">
        <RatingStars rating={rating} />
        {date && <Caption className="text-xs">{date}</Caption>}
      </div>

      <p className="t-caption text-pretty">{body}</p>

      {photoUrl && <MediaFrame src={photoUrl} alt="" ratio="wide" className="max-w-64" />}

      <div className="flex items-center justify-between gap-3 border-t border-outline-variant pt-3">
        <span className="text-sm font-medium">{authorName ?? "Clienta"}</span>
        <div className="flex items-center gap-3">
          {authorInstagram && (
            <a
              href={`https://instagram.com/${authorInstagram}`}
              target="_blank"
              rel="noopener nofollow"
              className="text-sm text-primary transition-colors hover:underline"
            >
              @{authorInstagram}
            </a>
          )}
          {action}
        </div>
      </div>
    </Panel>
  );
}

/**
 * Estado de la propia opinión en "Mis reservas": la clienta necesita saber si
 * quedó publicada, si sigue en revisión o si no pasó moderación.
 */
export function ReviewStatusChip({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending: { tone: "warning", label: "En revisión" },
    approved: { tone: "success", label: "Publicada" },
    rejected: { tone: "neutral", label: "No publicada" },
  } as const;

  const { tone, label } = map[status];
  return <Chip tone={tone}>{label}</Chip>;
}
