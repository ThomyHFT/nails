import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconCircle, MediaFrame, Panel } from "@/components/brand/surface";
import { Body, BodyLarge, Caption, Display, Eyebrow, Headline, Overline } from "@/components/brand/typography";

/**
 * Piezas de la vitrina pública: hero, galería, CTA de contacto y pie.
 */

/**
 * Hero editorial. En móvil apila texto sobre imagen; en escritorio abre a dos
 * columnas con la foto enmarcada, que es la lectura de los mockups.
 *
 * La imagen va en un marco propio y no de fondo detrás del texto: el fondo
 * lavado obliga a un velo que apaga la foto y baja el contraste del titular.
 */
export function Hero({
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
  return (
    <section className={cn("flex flex-col items-center gap-8 px-5 pt-10 pb-14 md:flex-row md:gap-12 md:py-20", className)}>
      {/* En móvil el trabajo va primero: en un oficio visual la foto no puede
          quedar bajo el pliegue del CTA. En escritorio vuelve al orden natural
          del documento (texto a la izquierda). */}
      <div className="order-2 flex w-full flex-col items-start gap-6 md:order-1 md:w-3/5">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Display className="text-primary">{title}</Display>
        {description && <BodyLarge className="max-w-md">{description}</BodyLarge>}
        {(primaryAction || secondaryAction) && (
          <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
            {primaryAction}
            {secondaryAction}
          </div>
        )}
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
 */
export function SiteFooter({
  businessName,
  links,
  className,
}: {
  businessName: string;
  links?: { label: string; href: string; external?: boolean }[];
  className?: string;
}) {
  return (
    <footer
      className={cn(
        "flex flex-col items-center gap-4 border-t border-outline-variant bg-surface-4 px-5 py-8 text-center md:flex-row md:justify-between md:text-left",
        className,
      )}
    >
      <span className="t-title text-primary">{businessName}</span>
      <Caption>
        © {new Date().getFullYear()} {businessName}. Todos los derechos reservados.
      </Caption>
      {links && links.length > 0 && (
        <nav className="flex gap-6">
          {links.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="t-caption rounded-sm text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="t-caption rounded-sm text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
      )}
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
