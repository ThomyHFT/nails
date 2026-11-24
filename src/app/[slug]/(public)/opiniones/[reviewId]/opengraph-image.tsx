import { ImageResponse } from "next/og";
import { loadPublicReview } from "@/app/[slug]/(public)/opiniones/[reviewId]/load-review";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Opinión de una clienta";

function quote(body: string, max = 220): string {
  return body.length > max ? `${body.slice(0, max - 1).trimEnd()}…` : body;
}

/**
 * Vista previa al compartir una opinión (SPEC 21): la foto si la hay, la cita,
 * las estrellas y el negocio, con su color. Sin opinión válida, una tarjeta
 * neutra en vez de un error (los scrapers de WhatsApp no reintentan).
 */
export default async function Image({ params }: { params: Promise<{ slug: string; reviewId: string }> }) {
  const { slug, reviewId } = await params;
  const data = await loadPublicReview(slug, reviewId);

  if (!data) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f4f1ee" }} />,
      size,
    );
  }

  const { brand, review, professional, authorName } = data;
  const photo = review.photoUrl && /^https:\/\//.test(review.photoUrl) ? review.photoUrl : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: brand.light.background,
          color: brand.light.foreground,
          fontFamily: "serif",
        }}
      >
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse solo entiende <img>
          <img src={photo} alt="" width={540} height={630} style={{ objectFit: "cover", width: 540, height: 630 }} />
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: 64, gap: 28 }}>
          <div style={{ display: "flex", fontSize: 48, color: brand.light.primary, letterSpacing: 6 }}>
            {"★".repeat(review.rating)}
            <span style={{ opacity: 0.25 }}>{"★".repeat(5 - review.rating)}</span>
          </div>
          <div style={{ display: "flex", fontSize: photo ? 38 : 48, lineHeight: 1.3 }}>“{quote(review.body, photo ? 160 : 220)}”</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 28, gap: 6 }}>
            {authorName && <span>{authorName}</span>}
            <span style={{ color: brand.light.primary, fontWeight: 600 }}>{professional.businessName}</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
