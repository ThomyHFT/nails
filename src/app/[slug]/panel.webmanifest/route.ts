import { manifestResponse } from "@/app/[slug]/_pwa/manifest-response";

/**
 * Manifiesto del panel (SPEC 20). Vive fuera de /admin a propósito: el
 * navegador pide el manifiesto sin cookies, y bajo /admin el middleware lo
 * mandaría al login. Solo expone el nombre público del negocio.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return manifestResponse(slug, "panel");
}
