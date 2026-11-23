import { ImageResponse } from "next/og";
import { loadTenantForPwa } from "@/app/[slug]/_pwa/manifest-response";
import { iconInitial } from "@/server/domain/tenant/web-manifest";

const VARIANTS: Record<string, { size: number; fontScale: number }> = {
  "192": { size: 192, fontScale: 0.55 },
  "512": { size: 512, fontScale: 0.55 },
  // Maskable: Android recorta hasta un 20% por borde, la letra va más chica.
  maskable: { size: 512, fontScale: 0.38 },
  // apple-touch-icon: iOS le pone las esquinas redondeadas.
  apple: { size: 180, fontScale: 0.55 },
};

/** Ícono de la app instalada: la inicial del negocio sobre su color (SPEC 20). */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; variant: string }> }) {
  const { slug, variant } = await params;
  const spec = VARIANTS[variant];
  if (!spec) return new Response("No encontrado", { status: 404 });

  const tenant = await loadTenantForPwa(slug);
  if (!tenant) return new Response("No encontrado", { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: tenant.brand.light.primary,
          color: tenant.brand.light.primaryForeground,
          fontSize: Math.round(spec.size * spec.fontScale),
          fontWeight: 600,
          fontFamily: "serif",
        }}
      >
        {iconInitial(tenant.professional.businessName)}
      </div>
    ),
    { width: spec.size, height: spec.size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
