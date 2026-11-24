import { bankDetailsText } from "@/server/domain/professional/commerce";
import { isPhoneVisible, type Professional } from "@/server/domain/professional/professional.entity";
import { whatsAppUrl } from "@/app/[slug]/(public)/links";
import type { DepositInfo } from "@/app/[slug]/(public)/_deposit/DepositInstructions";

/** Datos de transferencia listos para la vista, o `null` si la profesional no los cargó (SPEC 21). */
export function depositInfoFor(professional: Professional): DepositInfo | null {
  const details = professional.commerce.bankDetails;
  if (!details) return null;
  return {
    rows: [
      { label: "Titular", value: details.holderName },
      { label: "RUT", value: details.holderRut },
      { label: "Banco", value: details.bank },
      { label: "Cuenta", value: `${details.accountType} ${details.accountNumber}` },
      { label: "Correo", value: details.email },
    ],
    text: bankDetailsText(details),
    whatsAppUrl:
      isPhoneVisible(professional) && professional.phone
        ? whatsAppUrl(professional.phone, "Hola, te mando el comprobante del abono de mi reserva.")
        : null,
  };
}
