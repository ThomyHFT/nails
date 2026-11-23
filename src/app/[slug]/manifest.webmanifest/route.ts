import { manifestResponse } from "@/app/[slug]/_pwa/manifest-response";

/** Manifiesto del micrositio: la clienta lo instala y abre la portada (SPEC 20). */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return manifestResponse(slug, "public");
}
