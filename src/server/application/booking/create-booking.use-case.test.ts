import { describe, expect, it } from "vitest";
import { InMemoryAvailabilityRepository } from "@/server/application/booking/__fakes__/in-memory-availability-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { CreateBookingUseCase, SlotNotAvailableError } from "@/server/application/booking/create-booking.use-case";

const PROFESSIONAL_ID = "prof-1";
const MONDAY = "2026-08-10";
const EFFECTIVE_MONTH = "2026-08-01";

function makeUseCase() {
  const availabilityRepository = new InMemoryAvailabilityRepository();
  const bookingRepository = new InMemoryBookingRepository();
  const useCase = new CreateBookingUseCase(availabilityRepository, bookingRepository);
  return { useCase, availabilityRepository, bookingRepository };
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
});
