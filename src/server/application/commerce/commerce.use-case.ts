import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import {
  GIFT_CODE_ALPHABET,
  GIFT_CODE_LENGTH,
  MAX_GIFT_CARD_CLP,
  MAX_GIFT_MESSAGE,
  MAX_GIFT_NAME,
  MIN_GIFT_CARD_CLP,
  giftCardState,
  giftCodeFromIndices,
  type GiftCard,
  type GiftCardRepository,
} from "@/server/domain/commerce/gift-card";
import {
  MAX_PACKAGE_NAME,
  MAX_PACKAGE_SESSIONS,
  MIN_PACKAGE_SESSIONS,
  type ClientPackage,
  type PackageRepository,
  type ServicePackage,
} from "@/server/domain/commerce/package";
import type { ServicesRepository } from "@/server/domain/service/services-repository.port";

export class CommerceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommerceValidationError";
  }
}

export class CommerceNotFoundError extends Error {
  constructor(message = "No encontrado") {
    super(message);
    this.name = "CommerceNotFoundError";
  }
}

export class CommerceConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommerceConflictError";
  }
}

/** Fuente de enteros aleatorios en [0, max). En producción, `crypto.randomInt`. */
export type RandomInt = (max: number) => number;

/** Catálogo de paquetes y paquetes vendidos (SPEC 21). */
export class PackagesUseCase {
  constructor(
    private readonly packages: PackageRepository,
    private readonly services: ServicesRepository,
    private readonly bookings: BookingRepository,
  ) {}

  async create(
    professionalId: string,
    input: { serviceId: string; name: string; sessions: number; priceClp: number },
  ): Promise<ServicePackage> {
    const name = input.name.trim();
    if (name.length < 2 || name.length > MAX_PACKAGE_NAME) {
      throw new CommerceValidationError(`El nombre va de 2 a ${MAX_PACKAGE_NAME} caracteres`);
    }
    if (!Number.isInteger(input.sessions) || input.sessions < MIN_PACKAGE_SESSIONS || input.sessions > MAX_PACKAGE_SESSIONS) {
      throw new CommerceValidationError(`Las sesiones van de ${MIN_PACKAGE_SESSIONS} a ${MAX_PACKAGE_SESSIONS}`);
    }
    if (!Number.isInteger(input.priceClp) || input.priceClp < 0 || input.priceClp > 10_000_000) {
      throw new CommerceValidationError("Precio inválido");
    }
    const service = await this.services.findById(input.serviceId, professionalId);
    if (!service) throw new CommerceNotFoundError("Servicio no encontrado");
    return this.packages.createPackage({ professionalId, serviceId: service.id, name, sessions: input.sessions, priceClp: input.priceClp });
  }

  async setActive(professionalId: string, packageId: string, active: boolean): Promise<ServicePackage> {
    const updated = await this.packages.setPackageActive(packageId, professionalId, active);
    if (!updated) throw new CommerceNotFoundError("Paquete no encontrado");
    return updated;
  }

  /** Registra una venta hecha fuera de la app. Solo a una clienta que ya reservó con este negocio. */
  async sell(professionalId: string, clientUserId: string, packageId: string): Promise<ClientPackage> {
    const pkg = await this.packages.findPackage(packageId, professionalId);
    if (!pkg || !pkg.active) throw new CommerceNotFoundError("Paquete no encontrado");
    const history = await this.bookings.listByProfessionalAndClient(professionalId, clientUserId);
    if (history.length === 0) throw new CommerceNotFoundError("Clienta no encontrada");
    return this.packages.sellPackage({
      professionalId,
      clientUserId,
      packageId: pkg.id,
      serviceId: pkg.serviceId,
      name: pkg.name,
      sessionsTotal: pkg.sessions,
      priceClp: pkg.priceClp,
    });
  }

  async redeem(professionalId: string, clientPackageId: string, bookingId: string | null): Promise<void> {
    const pkg = await this.packages.findClientPackage(clientPackageId, professionalId);
    if (!pkg) throw new CommerceNotFoundError("Paquete no encontrado");
    if (bookingId) {
      const booking = await this.bookings.findById(bookingId);
      if (!booking || booking.professionalId !== professionalId || booking.clientUserId !== pkg.clientUserId) {
        throw new CommerceNotFoundError("Reserva no encontrada");
      }
    }
    if (!(await this.packages.redeemSession(pkg.id, bookingId))) {
      throw new CommerceConflictError("Este paquete ya no tiene sesiones");
    }
  }

  async undo(professionalId: string, clientPackageId: string): Promise<void> {
    const pkg = await this.packages.findClientPackage(clientPackageId, professionalId);
    if (!pkg) throw new CommerceNotFoundError("Paquete no encontrado");
    if (!(await this.packages.undoLastRedemption(pkg.id))) {
      throw new CommerceConflictError("No hay sesiones usadas para deshacer");
    }
  }
}

/** Gift cards (SPEC 21). */
export class GiftCardsUseCase {
  constructor(
    private readonly cards: GiftCardRepository,
    private readonly randomInt: RandomInt,
  ) {}

  private newCode(): string {
    return giftCodeFromIndices(Array.from({ length: GIFT_CODE_LENGTH }, () => this.randomInt(GIFT_CODE_ALPHABET.length)));
  }

  async issue(
    professionalId: string,
    input: { amountClp: number; buyerName: string; recipientName: string; message?: string | null; expiresAt?: Date | null },
    now: Date = new Date(),
  ): Promise<GiftCard> {
    if (!Number.isInteger(input.amountClp) || input.amountClp < MIN_GIFT_CARD_CLP || input.amountClp > MAX_GIFT_CARD_CLP) {
      throw new CommerceValidationError(
        `El monto va de $${MIN_GIFT_CARD_CLP.toLocaleString("es-CL")} a $${MAX_GIFT_CARD_CLP.toLocaleString("es-CL")}`,
      );
    }
    const buyerName = input.buyerName.trim();
    const recipientName = input.recipientName.trim();
    if (!buyerName || !recipientName || buyerName.length > MAX_GIFT_NAME || recipientName.length > MAX_GIFT_NAME) {
      throw new CommerceValidationError("Escribe quién la regala y para quién es");
    }
    const message = input.message?.trim() || null;
    if (message && message.length > MAX_GIFT_MESSAGE) {
      throw new CommerceValidationError(`El mensaje tiene hasta ${MAX_GIFT_MESSAGE} caracteres`);
    }
    if (input.expiresAt && input.expiresAt.getTime() <= now.getTime()) {
      throw new CommerceValidationError("El vencimiento tiene que ser una fecha futura");
    }

    // 50 bits por código: un choque es casi imposible, pero el índice único
    // de la base lo rechazaría; se reintenta con otro.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.cards.create({
          professionalId,
          code: this.newCode(),
          amountClp: input.amountClp,
          buyerName,
          recipientName,
          message,
          expiresAt: input.expiresAt ?? null,
        });
      } catch (err) {
        if (attempt === 2) throw err;
      }
    }
    throw new Error("unreachable");
  }

  async redeem(professionalId: string, giftCardId: string, amountClp: number, now: Date = new Date()): Promise<GiftCard> {
    const card = await this.cards.findById(giftCardId, professionalId);
    if (!card) throw new CommerceNotFoundError("Gift card no encontrada");
    if (!Number.isInteger(amountClp) || amountClp <= 0) throw new CommerceValidationError("Monto inválido");
    const state = giftCardState(card, now);
    if (state !== "active") {
      throw new CommerceConflictError(
        state === "expired" ? "La gift card está vencida" : state === "voided" ? "La gift card está anulada" : "La gift card no tiene saldo",
      );
    }
    if (amountClp > card.balanceClp) throw new CommerceConflictError("El monto supera el saldo");
    if (!(await this.cards.redeem(card.id, amountClp, null))) throw new CommerceConflictError("El saldo cambió; vuelve a intentar");
    return (await this.cards.findById(card.id, professionalId))!;
  }

  async void(professionalId: string, giftCardId: string): Promise<void> {
    const card = await this.cards.findById(giftCardId, professionalId);
    if (!card) throw new CommerceNotFoundError("Gift card no encontrada");
    if (!(await this.cards.voidCard(card.id, professionalId))) {
      throw new CommerceConflictError("Solo se puede anular una gift card sin cobros");
    }
  }
}
