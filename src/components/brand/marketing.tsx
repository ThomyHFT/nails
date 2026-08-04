import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconCircle, MediaFrame, Panel } from "@/components/brand/surface";
import { Body, BodyLarge, Caption, Display, Eyebrow, Headline, Overline } from "@/components/brand/typography";

/**
 * Piezas de la vitrina pública: hero, galería, CTA de contacto y pie.
 */

export type HeroLayout = "split" | "stacked" | "minimal";

/**
 * Hero editorial, en tres variantes (SPEC 14). La imagen siempre va en un
 * marco propio y nunca de fondo detrás del texto: el fondo lavado obliga a un
 * velo que apaga la foto y baja el contraste del titular a la vez.
 *
 * - `split` (default): retrato enmarcado al costado, la lectura original.
 * - `stacked`: foto ancha arriba a todo el contenedor, texto centrado debajo.
 * - `minimal`: sin foto, para el tenant que todavía no tiene una que valga la
 *   pena — nunca deja el hueco donde iría, aunque `imageUrl` venga cargado.
 */
export function Hero({
  layout = "split",
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  imageUrl,
  imageAlt,
  badge,
  className,
}: {
  layout?: HeroLayout;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  imageUrl?: string | null;
  imageAlt?: string;
  badge?: ReactNode;
  className?: string;
}) {
  const actions = (primaryAction || secondaryAction) && (
    <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
      {primaryAction}
      {secondaryAction}
    </div>
  );

  if (layout === "minimal") {
    return (
      <section className={cn("flex flex-col items-center gap-6 px-5 py-16 text-center md:py-24", className)}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Display className="max-w-2xl text-primary">{title}</Display>
        {description && <BodyLarge className="max-w-md">{description}</BodyLarge>}
        {actions && <div className="flex justify-center">{actions}</div>}
        {badge && <div className="mt-2">{badge}</div>}
      </section>
    );
  }

  if (layout === "stacked") {
    return (
      <section className={cn("flex flex-col gap-8 px-5 pt-10 pb-14 md:py-20", className)}>
        {imageUrl !== undefined && (
          <div className="relative w-full">
            <MediaFrame src={imageUrl} alt={imageAlt ?? ""} ratio="wide" className="shadow-e1" />
            {badge && <div className="absolute -bottom-5 left-4 md:-bottom-6 md:-left-6">{badge}</div>}
          </div>
        )}
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <Display className="text-primary">{title}</Display>
          {description && <BodyLarge className="max-w-md">{description}</BodyLarge>}
          {actions && <div className="flex justify-center">{actions}</div>}
        </div>
      </section>
    );
  }

  return (
    <section className={cn("flex flex-col items-center gap-8 px-5 pt-10 pb-14 md:flex-row md:gap-12 md:py-20", className)}>
      {/* En móvil el trabajo va primero: en un oficio visual la foto no puede
          quedar bajo el pliegue del CTA. En escritorio vuelve al orden natural
          del documento (texto a la izquierda). */}
      <div className="order-2 flex w-full flex-col items-start gap-6 md:order-1 md:w-3/5">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Display className="text-primary">{title}</Display>
        {description && <BodyLarge className="max-w-md">{description}</BodyLarge>}
        {actions}
      </div>

      {imageUrl !== undefined && (
        // Ancho acotado en escritorio: a media pantalla completa la portada
        // `portrait` medía ~800px de alto y dejaba el titular flotando en un
        // mar de crema. Con un máximo de 380px, el hero queda a la altura de
        // su propio contenido en vez de a la de la foto.
        <div className="relative order-1 w-full max-w-sm md:order-2 md:ml-auto md:w-2/5">
          <MediaFrame src={imageUrl} alt={imageAlt ?? ""} ratio="portrait" className="shadow-e1" />
          {badge && <div className="absolute -bottom-5 left-4 md:-bottom-6 md:-left-6">{badge}</div>}
        </div>
      )}
    </section>
  );
}

/**
 * Sello flotante sobre el hero (rating, clientas atendidas). Es el detalle que
 * en los mockups convierte una foto en prueba social.
 */
export function FloatingStat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: ReactNode;
}) {
  return (
    <Panel level={0} elevation="e2" padding="sm" className="flex items-center gap-4">
      <IconCircle size="md" tone="primary">
        {icon}
      </IconCircle>
      <div className="flex flex-col">
        <span className="t-headline text-primary">{value}</span>
        <Overline>{label}</Overline>
      </div>
    </Panel>
  );
}

/**
 * Grilla de portafolio. Dos columnas en móvil, hasta cuatro en escritorio,
 * con el zoom al hover que ya trae `MediaFrame`.
 *
 * Las columnas de escritorio siguen el conteo real de fotos: a cuatro fijas,
 * un portafolio con dos o tres fotos dejaba media grilla vacía a la derecha.
 */
export function GalleryGrid({
  items,
  className,
}: {
  items: { id: string; imageUrl: string; alt?: string }[];
  className?: string;
}) {
  const desktopCols = items.length === 1 ? "md:grid-cols-1" : items.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4";

  return (
    <div className={cn("grid grid-cols-2 gap-3 md:gap-4", desktopCols, items.length === 1 && "max-w-sm", className)}>
      {items.map((item) => (
        <MediaFrame key={item.id} src={item.imageUrl} alt={item.alt ?? ""} ratio="square" />
      ))}
    </div>
  );
}

/**
 * Tarjeta de contacto centrada — el bloque de WhatsApp del final de la landing.
 */
export function ContactCard({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Panel
      level={3}
      padding="lg"
      className={cn("mx-auto flex max-w-3xl flex-col items-center gap-5 text-center", className)}
    >
      <IconCircle size="lg" tone="primary">
        {icon}
      </IconCircle>
      <Headline className="text-primary">{title}</Headline>
      {description && <Body className="max-w-lg">{description}</Body>}
      {action}
    </Panel>
  );
}

/**
 * Pie de sitio del microsite del tenant.
 *
 * Antes era una sola franja `justify-between` (nombre · copyright · links) en
 * `surface-4`, que se despegaba del crema del tenant y leía plano, con el
 * copyright centrado pesando más que la marca. Pasa a dos columnas — marca +
 * tagline, y navegación — sobre `surface-2`, con el copyright y la firma como
 * cierre discreto abajo.
 */
export function SiteFooter({
  businessName,
  tagline,
  links,
  className,
}: {
  businessName: string;
  tagline?: string | null;
  links?: { label: string; href: string; external?: boolean }[];
  className?: string;
}) {
  const linkClasses =
    "t-body rounded-sm text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <footer className={cn("border-t border-outline-variant bg-surface-2", className)}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-10 text-center sm:text-left md:flex-row md:justify-between md:py-12">
        <div className="flex flex-col gap-1.5 items-center md:items-start">
          <span className="t-title text-primary">{businessName}</span>
          {tagline && <Caption className="max-w-xs">{tagline}</Caption>}
        </div>

        {links && links.length > 0 && (
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 md:justify-end">
            {links.map((link) =>
              link.external ? (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className={linkClasses}>
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} href={link.href} className={linkClasses}>
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        )}
      </div>

      <div className="border-t border-outline-variant px-5 py-4">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 sm:flex-row">
          <Caption className="text-xs">
            © {new Date().getFullYear()} {businessName}. Todos los derechos reservados.
          </Caption>
          <Caption className="text-xs">Hecho con AgendaUñas</Caption>
        </div>
      </div>
    </footer>
  );
}

/**
 * Estado vacío con tono de marca, para catálogo sin servicios o portafolio sin
 * fotos. Siempre ofrece la salida, nunca deja la página muerta.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-4 rounded-card border border-dashed border-outline-variant bg-surface-1 px-6 py-12 text-center", className)}>
      {icon && (
        <IconCircle size="md" tone="surface">
          {icon}
        </IconCircle>
      )}
      <div className="flex flex-col gap-1.5">
        <span className="t-title">{title}</span>
        {description && <Body className="max-w-sm">{description}</Body>}
      </div>
      {action}
    </div>
  );
}
