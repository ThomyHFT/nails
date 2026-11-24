import {
  MAX_DEPOSIT_CLP,
  MAX_REBOOK_DAYS,
  MIN_DEPOSIT_CLP,
  MIN_REBOOK_DAYS,
  isCompleteBankDetails,
  type BankDetails,
  type ProfessionalCommerce,
} from "@/server/domain/professional/commerce";
import type { Professional } from "@/server/domain/professional/professional.entity";
import type { ProfessionalRepository } from "@/server/domain/professional/professional-repository.port";

export class InvalidCommerceSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCommerceSettingsError";
  }
}

function trimDetails(details: BankDetails): BankDetails {
  return {
    bank: details.bank.trim(),
    accountType: details.accountType.trim(),
    accountNumber: details.accountNumber.trim(),
    holderName: details.holderName.trim(),
    holderRut: details.holderRut.trim(),
    email: details.email.trim(),
  };
}

/** Abono, "vuelve a reservar" y gift cards (SPEC 21). */
export class UpdateCommerceUseCase {
  constructor(private readonly professionalRepository: ProfessionalRepository) {}

  async execute(professionalId: string, input: ProfessionalCommerce): Promise<Professional> {
    const bankDetails = input.bankDetails ? trimDetails(input.bankDetails) : null;

    if (input.depositClp !== null) {
      if (!Number.isInteger(input.depositClp) || input.depositClp < MIN_DEPOSIT_CLP || input.depositClp > MAX_DEPOSIT_CLP) {
        throw new InvalidCommerceSettingsError(
          `El abono va de $${MIN_DEPOSIT_CLP.toLocaleString("es-CL")} a $${MAX_DEPOSIT_CLP.toLocaleString("es-CL")}`,
        );
      }
      if (!isCompleteBankDetails(bankDetails)) {
        throw new InvalidCommerceSettingsError("Para pedir abono completa todos los datos de transferencia");
      }
    }

    if (
      input.rebookAfterDays !== null &&
      (!Number.isInteger(input.rebookAfterDays) ||
        input.rebookAfterDays < MIN_REBOOK_DAYS ||
        input.rebookAfterDays > MAX_REBOOK_DAYS)
    ) {
      throw new InvalidCommerceSettingsError(`La invitación a volver va de ${MIN_REBOOK_DAYS} a ${MAX_REBOOK_DAYS} días`);
    }

    return this.professionalRepository.updateCommerce(professionalId, {
      depositClp: input.depositClp,
      // Se guardan aunque el abono esté apagado: apagarlo un mes no obliga a reescribirlos.
      bankDetails: bankDetails && Object.values(bankDetails).some((v) => v.length > 0) ? bankDetails : null,
      rebookAfterDays: input.rebookAfterDays,
      giftCardsEnabled: input.giftCardsEnabled,
    });
  }
}
