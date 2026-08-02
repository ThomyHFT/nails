"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { BrandButton, Caption, InfoNote, Overline, Panel, RatingInput } from "@/components/brand";

const BODY_MIN = 10;
const BODY_MAX = 1000;

type InitialReview = {
  rating: number;
  body: string;
  photoUrl: string | null;
  authorInstagram: string | null;
} | null;

export function ReviewForm({
  slug,
  bookingId,
  initialReview,
}: {
  slug: string;
  bookingId: string;
  initialReview: InitialReview;
}) {
  const router = useRouter();
  const isEdit = initialReview !== null;
  const [rating, setRating] = useState(initialReview?.rating ?? 5);
  const [body, setBody] = useState(initialReview?.body ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialReview?.photoUrl ?? null);
  const [instagram, setInstagram] = useState(initialReview?.authorInstagram ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bodyTooShort = body.trim().length < BODY_MIN;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/reviews", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          rating,
          body,
          photoUrl,
          authorInstagram: instagram || null,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(typeof data?.error === "string" ? data.error : "No se pudo guardar la opinión.");
        return;
      }
      router.push(`/${slug}/cuenta`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Panel className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Overline>Tu nota</Overline>
          <RatingInput value={rating} onChange={setRating} />
        </div>

        <label className="flex flex-col gap-2">
          <Overline>Tu opinión</Overline>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={BODY_MAX}
            rows={5}
            placeholder="Cuéntanos cómo fue tu experiencia…"
            className="t-body w-full resize-y rounded-card border border-outline-variant bg-background px-4 py-3 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <Caption className="self-end text-xs tabular-nums">
            {body.length}/{BODY_MAX}
          </Caption>
        </label>

        <div className="flex flex-col gap-2">
          <Overline>Foto (opcional)</Overline>
          <ImageUploader
            pathPrefix={`reviews/${slug}`}
            currentUrl={photoUrl}
            clientPayload={JSON.stringify({ bookingId })}
            onUploaded={setPhotoUrl}
          />
        </div>

        <label className="flex flex-col gap-2">
          <Overline>Instagram (opcional)</Overline>
          <input
            value={instagram}
            onChange={(event) => setInstagram(event.target.value)}
            placeholder="tu_usuario"
            className="t-body h-11 w-full rounded-lg border border-outline-variant bg-background px-4 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <Caption className="text-xs">Se muestra junto a tu opinión si la profesional la publica.</Caption>
        </label>
      </Panel>

      <InfoNote>La opinión no se publica al instante: la profesional la revisa antes de que se vea.</InfoNote>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <BrandButton type="submit" size="lg" disabled={isSubmitting || bodyTooShort} className="self-start">
        {isSubmitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Enviar opinión"}
      </BrandButton>
    </form>
  );
}
