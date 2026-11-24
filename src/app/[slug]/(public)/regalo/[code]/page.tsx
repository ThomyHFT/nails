import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gift } from "lucide-react";
import { BrandButton, Caption, Container, Display, Panel, Section } from "@/components/brand";
import { GetProfessionalBySlugUseCase } from "@/server/application/tenant/get-professional-by-slug.use-case";
import { giftCardState, normalizeGiftCode } from "@/server/domain/commerce/gift-card";
import { DrizzleGiftCardRepository } from "@/server/infrastructure/repositories/drizzle-commerce.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

type Params = { params: Promise<{ slug: string; code: string }> };

// La tarjeta lleva nombres y un mensaje personal: que no la indexe ningún buscador.
export const metadata: Metadata = { title: "Gift card", robots: { index: false, follow: false } };

async function load(slug: string, rawCode: string) {
  const code = normalizeGiftCode(decodeURIComponent(rawCode));
  if (!code) return null;
  const professional = await new GetProfessionalBySlugUseCase(new DrizzleProfessionalRepository()).execute(slug);
  if (!professional) return null;
  const card = await new DrizzleGiftCardRepository().findByCode(code);
  // El código es único en toda la app, pero la tarjeta solo existe en su negocio.
  if (!card || card.professionalId !== professional.id) return null;
  return { professional, card };
}

/** La gift card para regalar (SPEC 21): con la marca del negocio, el saldo y el botón de reservar. */
export default async function GiftCardPage({ params }: Params) {
  const { slug, code } = await params;
  const data = await load(slug, code);
  if (!data) notFound();
  const { professional, card } = data;
  const state = giftCardState(card);
  const formatDate = (date: Date) =>
    date.toLocaleDateString("es-CL", { dateStyle: "long", timeZone: professional.timezone });

  return (
    <Container size="md">
      <Section className="flex flex-col items-center gap-6 text-center">
        <Panel className="flex w-full max-w-md flex-col items-center gap-4 bg-primary-tint py-10">
          <Gift className="size-10 text-primary" aria-hidden />
          <Caption>Gift card de {professional.businessName}</Caption>
          <Display as="h1">Para {card.recipientName}</Display>
          <p className="text-sm text-muted-foreground">De {card.buyerName}</p>
          {card.message && <blockquote className="max-w-sm text-base italic">“{card.message}”</blockquote>}
          <p className="font-mono text-lg font-semibold tracking-widest">{card.code}</p>
          <p className="text-2xl font-semibold">${card.balanceClp.toLocaleString("es-CL")}</p>
          {card.balanceClp !== card.amountClp && (
            <Caption>Saldo disponible de ${card.amountClp.toLocaleString("es-CL")}</Caption>
          )}
          {card.expiresAt && state === "active" && <Caption>Válida hasta el {formatDate(card.expiresAt)}</Caption>}
          {state !== "active" && (
            <p className="text-sm font-medium text-destructive">
              {state === "used" ? "Ya fue usada por completo." : state === "expired" ? "Está vencida." : "Fue anulada."}
            </p>
          )}
        </Panel>

        {state === "active" && (
          <>
            <BrandButton size="lg" href={`/${slug}/reservar`}>
              Reservar mi hora
            </BrandButton>
            <Caption className="max-w-sm">Muestra el código al pagar: se descuenta del total.</Caption>
          </>
        )}
      </Section>
    </Container>
  );
}
