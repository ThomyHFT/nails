import { Check, Star } from "lucide-react";
import type { BrandTokenSet } from "@/server/domain/branding/brand-tokens";
import { gradientPlaceholder } from "@/app/estilo/placeholders";

/**
 * Micrositio de mentira dentro de un teléfono, para la portada.
 *
 * Es la prueba de la promesa: está construido solo con tokens (`bg-card`,
 * `text-primary`, `rounded-card`…), así que cuando el visitante cambia de
 * arquetipo o de color, el teléfono cambia con la página y sin una sola rama
 * por arquetipo — exactamente lo que le va a pasar a su propio sitio.
 *
 * Los datos son ficticios a propósito: un nombre inventado deja claro que es
 * una demostración y no el negocio de una clienta real.
 */

const SLOTS = ["10:30", "12:00", "15:30"];

export function LandingPreview({ palette }: { palette: BrandTokenSet }) {
  // Editorial usa el mismo color en `primary` y `accent`, y el degradé quedaba
  // un bloque plano. Cuando coinciden, el segundo extremo pasa a `secondary`,
  // que en ese arquetipo es justo el gris del otro lado del contraste.
  const coverTo =
    palette.accent.toLowerCase() === palette.primary.toLowerCase() ? palette.secondary : palette.accent;
  const cover = gradientPlaceholder(palette.primary, coverTo);

  return (
    <div
      aria-hidden
      className="w-full max-w-[19rem] rounded-[2.25rem] border border-outline-variant bg-surface-2 p-2.5 shadow-e3"
    >
      <div className="flex flex-col gap-3 overflow-hidden rounded-[1.75rem] bg-background p-4">
        {/* Encabezado del micrositio */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-heading text-base font-semibold text-primary">Uñas por Antonia</span>
          <span className="inline-flex items-center gap-1 rounded-pill bg-primary-tint px-2 py-1 text-[0.6875rem] font-semibold text-primary">
            <Star className="size-3 fill-current" />
            4,9
          </span>
        </div>

        {/* Portada */}
        <div className="relative overflow-hidden rounded-card">
          {/* eslint-disable-next-line @next/next/no-img-element -- data-URI generado desde los tokens, no un asset */}
          <img src={cover} alt="" className="h-28 w-full object-cover" />
        </div>

        {/* Servicio */}
        <div className="flex items-center justify-between gap-3 rounded-card border border-outline-variant bg-card p-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Manicura Rusa</span>
            <span className="text-xs text-muted-foreground">90 min</span>
          </div>
          <span className="t-price text-sm text-primary">$25.000</span>
        </div>

        {/* Horas */}
        <div className="flex flex-col gap-2">
          <span className="t-label text-[0.6875rem] text-muted-foreground">Horas de mañana</span>
          <div className="flex gap-2">
            {SLOTS.map((slot, index) => (
              <span
                key={slot}
                className={
                  index === 1
                    ? "flex-1 rounded-pill bg-primary py-1.5 text-center text-xs font-semibold text-primary-foreground"
                    : "flex-1 rounded-pill border border-outline-variant py-1.5 text-center text-xs font-medium text-muted-foreground"
                }
              >
                {slot}
              </span>
            ))}
          </div>
        </div>

        {/* Diseño elegido */}
        <div className="flex items-center gap-2 rounded-card bg-surface-2 p-3">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-4" strokeWidth={3} />
          </span>
          <span className="text-xs text-muted-foreground">Almendra · Mate · Francesa</span>
        </div>

        <span className="rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground">
          Reservar hora
        </span>
      </div>
    </div>
  );
}
