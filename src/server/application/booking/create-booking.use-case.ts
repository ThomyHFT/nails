import type { AvailabilityRepository } from "@/server/domain/availability/availability-repository.port";
import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { Booking } from "@/server/domain/booking/booking.entity";
import { calculateDesignQuote } from "@/server/domain/design/calculate-design-quote";
import type { DesignRepository } from "@/server/domain/design/design-repository.port";
import type { NailDesignPayload } from "@/server/domain/design/nail-design-payload";
import { verticalModules, type Vertical } from "@/server/domain/tenant/vertical";
import { GenerateAvailableSlotsUseCase } from "@/server/application/booking/generate-available-slots.use-case";

export class SlotNotAvailableError extends Error {
  constructor() {
    super("El horario elegido ya no está disponible");
    this.name = "SlotNotAvailableError";
  }
}

export class DesignerNotAvailableError extends Error {
  constructor() {
    super("Este negocio no tiene diseñador de uñas");
    this.name = "DesignerNotAvailableError";
  }
}

export interface CreateBookingInput {
  professionalId: string;
  professionalVertical: Vertical;
  timezone: string;
  bufferMinutes: number;
  clientUserId: string;
  serviceVariantId: string;
  date: string;
  startsAt: string;
  priceClp: number;
  durationMinutes: number;
  designPayload?: NailDesignPayload | null;
  designReferenceImageUrl?: string | null;
  clientNote?: string | null;
  now?: Date;
}

export class CreateBookingUseCase {
  constructor(
    private readonly availabilityRepository: AvailabilityRepository,
    private readonly bookingRepository: BookingRepository,
    private readonly designRepository: DesignRepository,
  ) {}

  async execute(input: CreateBookingInput): Promise<Booking> {
    if (input.designPayload && !verticalModules(input.professionalVertical).designer) {
      throw new DesignerNotAvailableError();
    }

    let extraPriceClp = 0;
    let extraMinutes = 0;

    if (input.designPayload) {
      const catalog = await this.designRepository.listElementsByProfessional(input.professionalId);
      const quote = calculateDesignQuote(input.designPayload, catalog);
      extraPriceClp = quote.extraPriceClp;
      extraMinutes = quote.extraMinutes;
    }

    const totalDurationMinutes = input.durationMinutes + extraMinutes;

    const generateSlots = new GenerateAvailableSlotsUseCase(this.availabilityRepository, this.bookingRepository);
    const availableSlots = await generateSlots.execute({
      professionalId: input.professionalId,
      timezone: input.timezone,
      bufferMinutes: input.bufferMinutes,
      date: input.date,
      durationMinutes: totalDurationMinutes,
      now: input.now,
    });

    const matchingSlot = availableSlots.find((slot) => slot.startsAt === input.startsAt);
    if (!matchingSlot) {
      throw new SlotNotAvailableError();
    }

    if (input.designPayload) {
      return this.bookingRepository.createWithDesign({
        professionalId: input.professionalId,
        clientUserId: input.clientUserId,
        serviceVariantId: input.serviceVariantId,
        startsAt: new Date(matchingSlot.startsAt),
        endsAt: new Date(matchingSlot.endsAt),
        priceClp: input.priceClp + extraPriceClp,
        durationMinutes: totalDurationMinutes,
        clientNote: input.clientNote ?? null,
        design: {
          payload: input.designPayload,
          extraPriceClp,
          extraMinutes,
          referenceImageUrl: input.designReferenceImageUrl ?? null,
        },
      });
    }

    return this.bookingRepository.create({
      professionalId: input.professionalId,
      clientUserId: input.clientUserId,
      serviceVariantId: input.serviceVariantId,
      startsAt: new Date(matchingSlot.startsAt),
      endsAt: new Date(matchingSlot.endsAt),
      priceClp: input.priceClp + extraPriceClp,
      durationMinutes: totalDurationMinutes,
      clientNote: input.clientNote ?? null,
    });
  }
}
