import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { AdminPageHeader, Caption, Overline, Panel, Title } from "@/components/brand";
import { ListServicesUseCase } from "@/server/application/service/list-services.use-case";
import { serviceShortCode } from "@/server/domain/tenant/short-link";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import { siteUrl } from "@/app/_lib/site-url";
import { CopyLinkButton } from "@/app/[slug]/admin/compartir/CopyLinkButton";

interface ShareLink {
  key: string;
  title: string;
  description: string;
  url: string;
  svg: string;
}

async function toQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function LinkCard({ link, slug }: { link: ShareLink; slug: string }) {
  return (
    <Panel padding="sm" className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* El SVG lo genera la librería a partir de nuestra propia URL: no lleva datos de terceros. */}
      <div
        className="size-28 shrink-0 rounded-md bg-white p-1 [&>svg]:size-full"
        aria-hidden
        dangerouslySetInnerHTML={{ __html: link.svg }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Title>{link.title}</Title>
        <Caption>{link.description}</Caption>
        <code className="break-all text-sm text-foreground">{link.url}</code>
        <div className="flex flex-wrap gap-2 pt-1">
          <CopyLinkButton url={link.url} />
          <a
            href={svgDataUrl(link.svg)}
            download={`qr-${slug}-${link.key}.svg`}
            className="inline-flex h-8 items-center rounded-pill border border-outline-variant px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Descargar QR
          </a>
        </div>
      </div>
    </Panel>
  );
}

/** Links cortos y QR para Instagram, Google y el mesón (SPEC 21). */
export default async function CompartirPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  if (!professional) notFound();

  const base = `${siteUrl()}/${slug}`;
  const services = (await new ListServicesUseCase(new DrizzleServicesRepository()).execute(professional.id)).filter(
    (service) => service.active,
  );

  const mainLinks = [
    { key: "sitio", title: "Tu sitio", description: "Para la bio de Instagram o tu tarjeta.", url: base },
    {
      key: "reservar",
      title: "Reservar",
      description: "Directo al calendario. Úsalo en el botón \"Reservar\" de Instagram o de Google.",
      url: `${base}/r`,
    },
  ];
  const serviceLinks = services.map((service) => ({
    key: serviceShortCode(service.id),
    title: service.name,
    description: "Abre la reserva con este servicio elegido.",
    url: `${base}/r/${serviceShortCode(service.id)}`,
  }));

  const [main, perService] = await Promise.all([
    Promise.all(mainLinks.map(async (link) => ({ ...link, svg: await toQrSvg(link.url) }))),
    Promise.all(serviceLinks.map(async (link) => ({ ...link, svg: await toQrSvg(link.url) }))),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <AdminPageHeader
        title="Compartir"
        description="Tus links cortos y sus códigos QR, listos para copiar o imprimir."
      />

      {!professional.publishedAt && (
        <Caption>Tu sitio todavía no es público: los links funcionan cuando verifiques tu correo.</Caption>
      )}

      <section className="flex flex-col gap-3">
        {main.map((link) => (
          <LinkCard key={link.key} link={link} slug={slug} />
        ))}
      </section>

      {perService.length > 0 && (
        <section className="flex flex-col gap-3">
          <Overline>Por servicio</Overline>
          {perService.map((link) => (
            <LinkCard key={link.key} link={link} slug={slug} />
          ))}
        </section>
      )}
    </div>
  );
}
