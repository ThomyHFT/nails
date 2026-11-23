/**
 * Manifiesto de app instalable (SPEC 20): uno para el micrositio de cada
 * negocio y otro para su panel. Cada uno tiene su propio `id`, así que se
 * pueden instalar los dos: el ícono del panel abre el panel y el de la
 * clienta abre la portada.
 */
export interface WebManifest {
  id: string;
  name: string;
  short_name: string;
  description?: string;
  start_url: string;
  scope: string;
  display: "standalone";
  background_color: string;
  theme_color: string;
  lang: string;
  icons: Array<{ src: string; sizes: string; type: string; purpose?: "any" | "maskable" }>;
}

export type ManifestKind = "public" | "panel";

/** Nombre corto para el ícono de la pantalla de inicio: Android corta cerca de 12 caracteres. */
export function shortName(name: string, max = 12): string {
  const trimmed = name.trim();
  if (trimmed.length <= max) return trimmed;
  const firstWord = trimmed.split(/\s+/)[0];
  return firstWord.length <= max ? firstWord : `${trimmed.slice(0, max - 1)}…`;
}

export function buildWebManifest(input: {
  kind: ManifestKind;
  slug: string;
  businessName: string;
  description?: string | null;
  themeColor: string;
  backgroundColor: string;
}): WebManifest {
  const { slug, kind } = input;
  const isPanel = kind === "panel";
  const root = isPanel ? `/${slug}/admin` : `/${slug}`;
  const name = isPanel ? `Panel · ${input.businessName}` : input.businessName;
  return {
    id: root,
    name,
    short_name: isPanel ? "Mi panel" : shortName(input.businessName),
    ...(input.description && !isPanel ? { description: input.description } : {}),
    start_url: root,
    // Sin "/" final: el scope tiene que contener al start_url, y "/fran" no
    // está dentro de "/fran/".
    scope: root,
    display: "standalone",
    background_color: input.backgroundColor,
    theme_color: input.themeColor,
    lang: "es-CL",
    icons: [
      { src: `/${slug}/icono/192`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/${slug}/icono/512`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `/${slug}/icono/maskable`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

/** La letra del ícono generado: la primera letra o número del nombre. */
export function iconInitial(businessName: string): string {
  const match = businessName.match(/[\p{L}\p{N}]/u);
  return (match?.[0] ?? "•").toLocaleUpperCase("es-CL");
}
