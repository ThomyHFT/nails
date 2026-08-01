"use client";

import { upload } from "@vercel/blob/client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

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
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

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
      const blob = await upload(`${pathPrefix}/${file.name}`, file, {
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

  return (
    <div className="flex flex-col gap-2">
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element -- URL de Vercel Blob, no un asset local optimizable
        <img
          src={preview}
          alt=""
          className="h-24 w-24 rounded-md object-cover"
          style={{ border: "1px solid var(--border)" }}
        />
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          {isUploading ? "Subiendo…" : preview ? "Cambiar imagen" : "Subir imagen"}
        </Button>
        <input
          id={inputId}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {error && (
        <p className="text-xs" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
