"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Marco de imagen: relación de aspecto fija, esquinas de marca y zoom suave al
 * hover.
 *
 * Es cliente por una sola razón: las fuentes son URLs de Vercel Blob que pueden
 * morir (blob borrado, tenant que cambió de portada). Con `onError` la imagen
 * rota se cae y queda la superficie tonal del marco, que se ve como un espacio
 * vacío intencional y no como un ícono de imagen rota.
 */
export function MediaFrame({
  src,
  alt,
  ratio = "square",
  className,
  children,
  rounded = "card",
  style,
}: {
  src?: string | null;
  alt: string;
  ratio?: "square" | "portrait" | "video" | "wide";
  className?: string;
  children?: ReactNode;
  rounded?: "card" | "band" | "full";
  style?: CSSProperties;
}) {
  const [failed, setFailed] = useState(false);

  const ratios = {
    square: "aspect-square",
    portrait: "aspect-[4/5]",
    video: "aspect-video",
    wide: "aspect-[16/10]",
  } as const;

  const roundings = { card: "rounded-card", band: "rounded-band", full: "rounded-full" } as const;

  return (
    <div
      className={cn(
        "group relative overflow-hidden border border-outline-variant bg-surface-2",
        ratios[ratio],
        roundings[rounded],
        className,
      )}
      style={style}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitraria (Vercel Blob), no un asset local optimizable
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-cover transition-transform duration-500 [transition-timing-function:var(--ease-brand)] group-hover:scale-105"
        />
      ) : null}
      {children}
    </div>
  );
}
