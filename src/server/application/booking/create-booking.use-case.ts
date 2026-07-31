import type { AvailabilityRepository } from "@/server/domain/availability/availability-repository.port";
import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { Booking } from "@/server/domain/booking/booking.entity";
import { GenerateAvailableSlotsUseCase } from "@/server/application/booking/generate-available-slots.use-case";

export class SlotNotAvailableError extends Error {
  constructor() {
    super("El horario elegido ya no está disponible");
    this.name = "SlotNotAvailableError";
  }
}

export interface CreateBookingInput {
  professionalId: string;
  timezone: string;
  bufferMinutes: number;
  clientUserId: string;
  serviceVariantId: string;
  date: string;
  startsAt: string;
  priceClp: number;
  durationMinutes: number;
  clientNote?: string | null;
  now?: Date;
}

export class CreateBookingUseCase {
  constructor(
    private readonly availabilityRepository: AvailabilityRepository,
    private readonly bookingRepository: BookingRepository,
  ) {}

  async execute(input: CreateBookingInput): Promise<Booking> {
    const generateSlots = new GenerateAvailableSlotsUseCase(this.availabilityRepository, this.bookingRepository);
    const availableSlots = await generateSlots.execute({
      professionalId: input.professionalId,
      timezone: input.timezone,
      bufferMinutes: input.bufferMinutes,
      date: input.date,
      durationMinutes: input.durationMinutes,
      now: input.now,
    });

    const matchingSlot = availableSlots.find((slot) => slot.startsAt === input.startsAt);
    if (!matchingSlot) {
      throw new SlotNotAvailableError();
    }

    return this.bookingRepository.create({
      professionalId: input.professionalId,
      clientUserId: input.clientUserId,
      serviceVariantId: input.serviceVariantId,
      startsAt: new Date(matchingSlot.startsAt),
      endsAt: new Date(matchingSlot.endsAt),
      priceClp: input.priceClp,
      durationMinutes: input.durationMinutes,
      clientNote: input.clientNote ?? null,
    });
  }
}
