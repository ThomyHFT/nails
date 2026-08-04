"use client";

import { useEffect } from "react";
import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaFrame, Panel, Title } from "@/components/brand";

type GalleryItem = { id: string; imageUrl: string; caption?: string | null };

/**
 * Galería de portafolio con ampliación a pantalla completa. Antes las fotos
 * no se podían mirar de cerca — el producto es la foto, y no había forma de
 * verla más grande que la miniatura de la grilla.
 *
 * Las columnas de escritorio siguen el conteo real (ver GalleryGrid): con dos
 * o tres fotos, cuatro columnas fijas dejaban media grilla vacía.
 */
export function GalleryLightbox({ items, className }: { items: GalleryItem[]; className?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const isOpen = openIndex !== null;

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenIndex(null);
      if (event.key === "ArrowRight") setOpenIndex((current) => (current === null ? null : (current + 1) % items.length));
      if (event.key === "ArrowLeft") {
        setOpenIndex((current) => (current === null ? null : (current - 1 + items.length) % items.length));
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    // El scroll de fondo se congela mientras la foto ocupa toda la pantalla:
    // sin esto, el gesto de swipe para cambiar de foto en móvil también
    // scrollea la página detrás.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, items.length]);

  const desktopCols = items.length === 1 ? "md:grid-cols-1" : items.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4";
  const current = openIndex !== null ? items[openIndex] : null;

  return (
    <>
      <div className={cn("grid grid-cols-2 gap-3 md:gap-4", desktopCols, items.length === 1 && "max-w-sm", className)}>
        {items.map((item, index) => (
          <Panel key={item.id} padding="sm" className="flex h-full flex-col gap-3">
            <button
              type="button"
              aria-label={`Ampliar foto ${index + 1} de ${items.length}`}
              onClick={() => setOpenIndex(index)}
              className="block w-full overflow-hidden rounded-card text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <MediaFrame src={item.imageUrl} alt={item.caption ?? ""} ratio="square" />
            </button>
            <Panel
              level={2}
              bordered={false}
              elevation="none"
              padding="sm"
              className="flex min-h-16 flex-1 items-center justify-center"
            >
              {item.caption && (
                <Title className="text-center text-balance text-sm text-primary">{item.caption}</Title>
              )}
            </Panel>
          </Panel>
        ))}
      </div>

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto del portafolio"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4 backdrop-blur-sm"
          onClick={() => setOpenIndex(null)}
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setOpenIndex(null)}
            className="absolute top-4 right-4 inline-flex size-11 items-center justify-center rounded-full bg-background/10 text-background outline-none transition-colors hover:bg-background/20 focus-visible:ring-2 focus-visible:ring-background"
          >
            <X className="size-6" />
          </button>

          {items.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Foto anterior"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenIndex((openIndex! - 1 + items.length) % items.length);
                }}
                className="absolute left-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/10 text-background outline-none transition-colors hover:bg-background/20 focus-visible:ring-2 focus-visible:ring-background sm:left-4"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                aria-label="Foto siguiente"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenIndex((openIndex! + 1) % items.length);
                }}
                className="absolute right-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/10 text-background outline-none transition-colors hover:bg-background/20 focus-visible:ring-2 focus-visible:ring-background sm:right-4"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}

          <div className="flex max-h-full max-w-full flex-col items-center gap-3" onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- URL de Vercel Blob, no un asset local optimizable */}
            <img
              src={current.imageUrl}
              alt={current.caption ?? ""}
              className="max-h-[80vh] max-w-full rounded-card object-contain shadow-e3"
            />
            {current.caption && <p className="text-center text-sm text-background">{current.caption}</p>}
          </div>
        </div>
      )}
    </>
  );
}
