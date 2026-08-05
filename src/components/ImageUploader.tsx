"use client";

import { upload } from "@vercel/blob/client";
import { ImagePlus, Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { BrandButton, Caption, MediaFrame } from "@/components/brand";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 1920;
const COMPRESS_QUALITY = 0.82;

/**
 * Comprimimos en el navegador antes de subir: redimensiona al lado largo
 * máximo y reencodea a WEBP. Si el navegador no soporta WEBP de salida
 * (Safari viejo) `toBlob` devuelve null y usamos el archivo original.
 */
async function compressImage(file: File): Promise<File> {
  if (file.type === "image/webp" || file.type === "image/gif") return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", COMPRESS_QUALITY),
  );
  if (!blob || blob.size >= file.size) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".webp";
  return new File([blob], newName, { type: "image/webp" });
}

/**
 * Subida de imagen del sistema de marca. Antes usaba el `Button` de shadcn,
 * un `<img>` de 24px con borde en línea y texto de error con `style={{}}`: la
 * única pieza de la clienta (diseñador, reseña) y del admin (marca,
 * portafolio) que se veía de otro producto. Ahora comparte `MediaFrame` y
 * `BrandButton`, y acepta arrastrar el archivo además de elegirlo.
 */
export function ImageUploader({
  pathPrefix,
  currentUrl,
  clientPayload,
  onUploaded,
}: {
  pathPrefix: string;
  currentUrl?: string | null;
  clientPayload?: string;
  onUploaded: (url: string) => void;
}) {
  const inputId = useId();
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);

  async function processFile(file: File) {
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Solo se aceptan imágenes JPG, PNG o WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("La imagen no puede superar 8 MB.");
      return;
    }

    setIsUploading(true);
    try {
      const compressed = await compressImage(file);
      const blob = await upload(`${pathPrefix}/${compressed.name}`, compressed, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload,
      });
      setPreview(blob.url);
      onUploaded(blob.url);
    } catch {
      setError("No se pudo subir la imagen. Intenta de nuevo.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void processFile(file);
  }

  function handleDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={isUploading}
        onClick={() => document.getElementById(inputId)?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        className="outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
      >
        <MediaFrame
          src={preview}
          alt=""
          ratio="square"
          className={cn(
            "size-28 transition-colors",
            !preview && "border-dashed",
            isDraggingOver ? "border-primary bg-primary-tint" : "hover:border-outline",
          )}
        >
          {!preview && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
              {isUploading ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="size-5" aria-hidden />
              )}
              <span className="t-caption text-center text-xs leading-tight">
                {isUploading ? "Subiendo…" : "Arrastra o elige"}
              </span>
            </div>
          )}
          {preview && isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/40">
              <Loader2 className="size-5 animate-spin text-white" aria-hidden />
            </div>
          )}
        </MediaFrame>
      </button>

      {preview && (
        <BrandButton
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => document.getElementById(inputId)?.click()}
          className="self-start"
        >
          Cambiar imagen
        </BrandButton>
      )}

      <input
        id={inputId}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <Caption className="text-xs text-destructive">{error}</Caption>}
    </div>
  );
}
