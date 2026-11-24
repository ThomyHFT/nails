import { Gift } from "lucide-react";
import { BrandButton, Caption, Overline, Panel, Price, Title } from "@/components/brand";
import { whatsAppUrl } from "@/app/[slug]/(public)/links";

export interface PublicPackage {
  id: string;
  name: string;
  sessions: number;
  priceClp: number;
  serviceName: string | null;
}

/**
 * Paquetes y gift cards en el sitio (SPEC 21). Sin pasarela de pago: "Lo
 * quiero" abre WhatsApp con el pedido escrito y la venta se cierra ahí.
 */
export function PackagesAndGifts({
  packages,
  giftCardsEnabled,
  phone,
  businessName,
}: {
  packages: PublicPackage[];
  giftCardsEnabled: boolean;
  /** Teléfono visible de la profesional; sin él no hay a dónde escribir y la sección no se muestra. */
  phone: string | null;
  businessName: string;
}) {
  if (!phone || (packages.length === 0 && !giftCardsEnabled)) return null;

  return (
    <section className="flex flex-col gap-4">
      {packages.length > 0 && (
        <>
          <Overline>Paquetes</Overline>
          <div className="grid gap-3 sm:grid-cols-2">
            {packages.map((pkg) => (
              <Panel key={pkg.id} padding="sm" className="flex flex-col gap-2">
                <Title>{pkg.name}</Title>
                <Caption>
                  {pkg.sessions} sesiones{pkg.serviceName ? ` de ${pkg.serviceName}` : ""}
                </Caption>
                <div className="flex items-center justify-between gap-3">
                  <Price clp={pkg.priceClp} size="sm" />
                  <BrandButton
                    size="sm"
                    href={whatsAppUrl(phone, `Hola, quiero el paquete "${pkg.name}" de ${businessName}.`)}
                  >
                    Lo quiero
                  </BrandButton>
                </div>
              </Panel>
            ))}
          </div>
        </>
      )}

      {giftCardsEnabled && (
        <Panel padding="sm" className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Gift className="size-6 text-primary" aria-hidden />
            <div className="flex flex-col">
              <Title>Regala una gift card</Title>
              <Caption>Elige el monto y te mando una tarjeta para regalar.</Caption>
            </div>
          </div>
          <BrandButton
            size="sm"
            variant="outline"
            href={whatsAppUrl(phone, `Hola, quiero regalar una gift card de ${businessName}.`)}
          >
            Regalar
          </BrandButton>
        </Panel>
      )}
    </section>
  );
}
