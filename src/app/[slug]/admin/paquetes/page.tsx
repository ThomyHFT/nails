import { notFound } from "next/navigation";
import { Gift, Package } from "lucide-react";
import { AdminPageHeader, Caption, Chip, EmptyState, Panel, Price, Title } from "@/components/brand";
import { ListServicesUseCase } from "@/server/application/service/list-services.use-case";
import { giftCardState, type GiftCardState } from "@/server/domain/commerce/gift-card";
import {
  DrizzleGiftCardRepository,
  DrizzlePackageRepository,
} from "@/server/infrastructure/repositories/drizzle-commerce.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import {
  GiftCardActions,
  NewGiftCardForm,
  NewPackageForm,
  PackageActiveToggle,
} from "@/app/[slug]/admin/paquetes/CommerceForms";

const STATE_LABEL: Record<GiftCardState, { label: string; tone: "success" | "neutral" | "warning" | "danger" }> = {
  active: { label: "Vigente", tone: "success" },
  used: { label: "Usada", tone: "neutral" },
  expired: { label: "Vencida", tone: "warning" },
  voided: { label: "Anulada", tone: "danger" },
};

function formatDate(date: Date) {
  return date.toLocaleDateString("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" });
}

/** Paquetes y gift cards (SPEC 21). Se venden fuera de la app; acá se registran y se cobran. */
export default async function PaquetesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  if (!professional) notFound();

  const [services, packages, giftCards] = await Promise.all([
    new ListServicesUseCase(new DrizzleServicesRepository()).execute(professional.id),
    new DrizzlePackageRepository().listPackages(professional.id),
    new DrizzleGiftCardRepository().listByProfessional(professional.id),
  ]);
  const serviceName = new Map(services.map((s) => [s.id, s.name]));
  const now = new Date();

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <AdminPageHeader
        title="Paquetes y gift cards"
        description="Se pagan por transferencia o en persona. Acá registras la venta y descuentas lo que se usa."
      />

      <Panel className="flex flex-col gap-4">
        <Title>Paquetes</Title>
        <Caption>
          Los activos aparecen en tu sitio con &quot;Lo quiero&quot;, que te escribe por WhatsApp. La venta se registra
          en la ficha de cada clienta.
        </Caption>
        <NewPackageForm services={services.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }))} />
        {packages.length === 0 ? (
          <EmptyState icon={<Package className="size-5" />} title="Todavía no tienes paquetes" description="Por ejemplo: 4 manicures por el precio de 3." />
        ) : (
          <ul className="flex flex-col divide-y divide-outline-variant">
            {packages.map((pkg) => (
              <li key={pkg.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{pkg.name}</span>
                  <Caption className="text-xs">
                    {pkg.sessions} sesiones de {serviceName.get(pkg.serviceId) ?? "un servicio"}
                  </Caption>
                </div>
                <div className="flex items-center gap-3">
                  <Price clp={pkg.priceClp} size="sm" />
                  {!pkg.active && <Chip>Inactivo</Chip>}
                  <PackageActiveToggle packageId={pkg.id} active={pkg.active} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="flex flex-col gap-4">
        <Title>Gift cards</Title>
        <Caption>
          Emítela cuando recibas el pago y manda el enlace a quien la regaló.
          {!professional.commerce.giftCardsEnabled && " Para ofrecerlas en tu sitio, actívalas en Disponibilidad."}
        </Caption>
        <NewGiftCardForm />
        {giftCards.length === 0 ? (
          <EmptyState icon={<Gift className="size-5" />} title="Todavía no emites gift cards" description="Cada una tiene un código y una página para regalar." />
        ) : (
          <ul className="flex flex-col divide-y divide-outline-variant">
            {giftCards.map((card) => {
              const state = giftCardState(card, now);
              const meta = STATE_LABEL[state];
              return (
                <li key={card.id} className="flex flex-col gap-2 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-sm font-semibold tracking-wider">{card.code}</span>
                      <Caption className="text-xs">
                        De {card.buyerName} para {card.recipientName} · emitida {formatDate(card.createdAt)}
                        {card.expiresAt && ` · vence ${formatDate(card.expiresAt)}`}
                      </Caption>
                      <a
                        href={`/${slug}/regalo/${card.code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-fit text-xs font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        Ver la tarjeta para regalar
                      </a>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Chip tone={meta.tone}>{meta.label}</Chip>
                      <span className="text-sm">
                        Saldo <strong>${card.balanceClp.toLocaleString("es-CL")}</strong> de $
                        {card.amountClp.toLocaleString("es-CL")}
                      </span>
                    </div>
                  </div>
                  {(() => {
                    const canRedeem = state === "active";
                    const canVoid = !card.hasRedemptions && state !== "voided";
                    return canRedeem || canVoid ? (
                      <GiftCardActions
                        giftCardId={card.id}
                        balanceClp={card.balanceClp}
                        canRedeem={canRedeem}
                        canVoid={canVoid}
                      />
                    ) : null;
                  })()}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

    </div>
  );
}
