import { describe, expect, it } from "vitest";
import { InMemoryAvailabilityRepository } from "@/server/application/booking/__fakes__/in-memory-availability-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { InMemoryDesignRepository } from "@/server/application/design/__fakes__/in-memory-design-repository";
import { CreateBookingUseCase, SlotNotAvailableError } from "@/server/application/booking/create-booking.use-case";
import type { NailDesignPayload } from "@/server/domain/design/nail-design-payload";

const PROFESSIONAL_ID = "prof-1";
const MONDAY = "2026-08-10";
const EFFECTIVE_MONTH = "2026-08-01";

function makeUseCase() {
  const availabilityRepository = new InMemoryAvailabilityRepository();
  const bookingRepository = new InMemoryBookingRepository();
  const designRepository = new InMemoryDesignRepository();
  const useCase = new CreateBookingUseCase(availabilityRepository, bookingRepository, designRepository);
  return { useCase, availabilityRepository, bookingRepository, designRepository };
}

async function withMondayRule(availabilityRepository: InMemoryAvailabilityRepository) {
  await availabilityRepository.createRule({
    professionalId: PROFESSIONAL_ID,
    weekday: 1,
    startTime: "09:00",
    endTime: "12:00",
    effectiveMonth: EFFECTIVE_MONTH,
  });
}

describe("CreateBookingUseCase", () => {
  it("creates a pending booking for a valid slot", async () => {
    const { useCase, availabilityRepository } = makeUseCase();
    await withMondayRule(availabilityRepository);

    const booking = await useCase.execute({
      professionalId: PROFESSIONAL_ID,
      timezone: "UTC",
      bufferMinutes: 0,
      clientUserId: "client-1",
      serviceVariantId: "variant-1",
      date: MONDAY,
      startsAt: "2026-08-10T09:00:00.000Z",
      priceClp: 15_000,
      durationMinutes: 60,
    });

    expect(booking.status).toBe("pending");
    expect(booking.designId).toBeNull();
    expect(booking.priceClp).toBe(15_000);
  });

  it("rejects booking a slot already taken by another booking", async () => {
    const { useCase, availabilityRepository } = makeUseCase();
    await withMondayRule(availabilityRepository);

    await useCase.execute({
      professionalId: PROFESSIONAL_ID,
      timezone: "UTC",
      bufferMinutes: 0,
      clientUserId: "client-1",
      serviceVariantId: "variant-1",
      date: MONDAY,
      startsAt: "2026-08-10T09:00:00.000Z",
      priceClp: 15_000,
      durationMinutes: 60,
    });

    await expect(
      useCase.execute({
        professionalId: PROFESSIONAL_ID,
        timezone: "UTC",
        bufferMinutes: 0,
        clientUserId: "client-2",
        serviceVariantId: "variant-1",
        date: MONDAY,
        startsAt: "2026-08-10T09:00:00.000Z",
        priceClp: 15_000,
        durationMinutes: 60,
      }),
    ).rejects.toBeInstanceOf(SlotNotAvailableError);
  });

  it("rejects a slot less than 2 hours from now", async () => {
    const { useCase, availabilityRepository } = makeUseCase();
    await withMondayRule(availabilityRepository);

    await expect(
      useCase.execute({
        professionalId: PROFESSIONAL_ID,
        timezone: "UTC",
        bufferMinutes: 0,
        clientUserId: "client-1",
        serviceVariantId: "variant-1",
        date: MONDAY,
        startsAt: "2026-08-10T09:00:00.000Z",
        priceClp: 15_000,
        durationMinutes: 60,
        now: new Date("2026-08-10T08:00:00Z"),
      }),
    ).rejects.toBeInstanceOf(SlotNotAvailableError);
  });

  it("rejects a slot outside the available range", async () => {
    const { useCase, availabilityRepository } = makeUseCase();
    await withMondayRule(availabilityRepository);

    await expect(
      useCase.execute({
        professionalId: PROFESSIONAL_ID,
        timezone: "UTC",
        bufferMinutes: 0,
        clientUserId: "client-1",
        serviceVariantId: "variant-1",
        date: MONDAY,
        startsAt: "2026-08-10T20:00:00.000Z",
        priceClp: 15_000,
        durationMinutes: 60,
      }),
    ).rejects.toBeInstanceOf(SlotNotAvailableError);
  });

  it("adds the design's extra minutes to the slot duration and discards slots that no longer fit", async () => {
    const { useCase, availabilityRepository, designRepository } = makeUseCase();
    await availabilityRepository.createRule({
      professionalId: PROFESSIONAL_ID,
      weekday: 1,
      startTime: "09:00",
      endTime: "10:00", // solo alcanza para la duración base (60 min), no para base + 30 extra
      effectiveMonth: EFFECTIVE_MONTH,
    });

    await designRepository.createElement({
      professionalId: PROFESSIONAL_ID,
      category: "color",
      code: "red",
      label: "Rojo",
      colorHex: "#FF0000",
    });
    await designRepository.createElement({
      professionalId: PROFESSIONAL_ID,
      category: "finish",
      code: "matte",
      label: "Mate",
      extraMinutes: 3, // 3 min * 10 uñas = 30 min extra
    });

    const payload: NailDesignPayload = {
      version: 2,
      shape: "almond",
      technique: null,
      nails: Array.from({ length: 10 }, () => ({
        baseColorCode: "red",
        baseColorHex: "#FF0000",
        finish: "matte",
        decorations: [],
      })),
    };

    await expect(
      useCase.execute({
        professionalId: PROFESSIONAL_ID,
        timezone: "UTC",
        bufferMinutes: 0,
        clientUserId: "client-1",
        serviceVariantId: "variant-1",
        date: MONDAY,
        startsAt: "2026-08-10T09:00:00.000Z",
        priceClp: 15_000,
        durationMinutes: 60,
        designPayload: payload,
      }),
    ).rejects.toBeInstanceOf(SlotNotAvailableError);

    const booking = await useCase.execute({
      professionalId: PROFESSIONAL_ID,
      timezone: "UTC",
      bufferMinutes: 0,
      clientUserId: "client-1",
      serviceVariantId: "variant-1",
      date: MONDAY,
      startsAt: "2026-08-10T09:00:00.000Z",
      priceClp: 15_000,
      durationMinutes: 60,
    });

    expect(booking.durationMinutes).toBe(60);
  });
});
