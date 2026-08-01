import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MediaFrame } from "@/components/brand/surface";

/**
 * Navegación del microsite. Ambas piezas son presentacionales: reciben los
 * items ya resueltos, así el cálculo de la ruta activa se queda en el
 * componente cliente que las use y estas pueden renderizarse en servidor.
 */

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
};

/**
 * Barra superior: logo circular, nombre del estudio en la familia de heading, y
 * navegación de escritorio con subrayado en el activo.
 */
export function AppHeader({
  homeHref,
  businessName,
  logoUrl,
  items,
  action,
  className,
}: {
  homeHref: string;
  businessName: string;
  logoUrl?: string | null;
  items?: { href: string; label: string; active?: boolean }[];
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-outline-variant bg-background/85 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5">
        <Link href={homeHref} className="flex items-center gap-3">
          {logoUrl ? (
            <MediaFrame src={logoUrl} alt={businessName} ratio="square" rounded="full" className="size-10 shrink-0" />
          ) : null}
          <span className="t-title text-primary">{businessName}</span>
        </Link>

        {items && items.length > 0 && (
          <nav className="hidden items-center gap-8 md:flex">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "t-body pb-1 transition-colors",
                  item.active
                    ? "border-b border-primary text-primary"
                    : "text-muted-foreground hover:text-primary",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {action}
      </div>
    </header>
  );
}

/**
 * Barra inferior móvil. El activo va en píldora tonal sólida en vez de un
 * cambio de color de icono: en pantallas chicas el color solo no alcanza para
 * leer dónde estoy.
 */
export function BottomNavBar({ items, className }: { items: NavItem[]; className?: string }) {
  return (
    <nav
      className={cn(
        "sticky bottom-0 z-30 flex items-center justify-around gap-1 border-t border-outline-variant bg-surface-1/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden",
        className,
      )}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "flex min-w-20 flex-col items-center gap-1 rounded-pill px-3 py-1.5 text-xs font-medium transition-all duration-200 [transition-timing-function:var(--ease-brand)] active:scale-95 [&_svg]:size-5",
            item.active
              ? "bg-primary-container text-on-primary-container"
              : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
          )}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
