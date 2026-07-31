import { describe, expect, it } from "vitest";
import { InMemoryAvailabilityRepository } from "@/server/application/booking/__fakes__/in-memory-availability-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { GenerateAvailableSlotsUseCase } from "@/server/application/booking/generate-available-slots.use-case";

const PROFESSIONAL_ID = "prof-1";
const MONDAY = "2026-08-10";
const EFFECTIVE_MONTH = "2026-08-01";
const NOW = new Date("2026-08-10T08:00:00Z");

function makeUseCase() {
  const availabilityRepository = new InMemoryAvailabilityRepository();
  const bookingRepository = new InMemoryBookingRepository();
  const useCase = new GenerateAvailableSlotsUseCase(availabilityRepository, bookingRepository);
  return { useCase, availabilityRepository, bookingRepository };
}

describe("GenerateAvailableSlotsUseCase", () => {
  it("generates slots from a simple availability rule", async () => {
    const { useCase, availabilityRepository } = makeUseCase();
    await availabilityRepository.createRule({
      professionalId: PROFESSIONAL_ID,
      weekday: 1,
      startTime: "09:00",
      endTime: "12:00",
      effectiveMonth: EFFECTIVE_MONTH,
    });

    const slots = await useCase.execute({
      professionalId: PROFESSIONAL_ID,
      timezone: "UTC",
      bufferMinutes: 0,
      date: MONDAY,
      durationMinutes: 60,
      now: new Date("2026-08-01T00:00:00Z"),
    });

    expect(slots).toEqual([
      { startsAt: "2026-08-10T09:00:00.000Z", endsAt: "2026-08-10T10:00:00.000Z" },
      { startsAt: "2026-08-10T10:00:00.000Z", endsAt: "2026-08-10T11:00:00.000Z" },
      { startsAt: "2026-08-10T11:00:00.000Z", endsAt: "2026-08-10T12:00:00.000Z" },
    ]);
  });

  it("offers no slots when a blocked exception exists for the day", async () => {
    const { useCase, availabilityRepository } = makeUseCase();
    await availabilityRepository.createRule({
      professionalId: PROFESSIONAL_ID,
      weekday: 1,
      startTime: "09:00",
      endTime: "12:00",
      effectiveMonth: EFFECTIVE_MONTH,
    });
    await availabilityRepository.createException({
      professionalId: PROFESSIONAL_ID,
      date: MONDAY,
      kind: "blocked",
    });

    const slots = await useCase.execute({
      professionalId: PROFESSIONAL_ID,
      timezone: "UTC",
      bufferMinutes: 0,
      date: MONDAY,
      durationMinutes: 60,
      now: new Date("2026-08-01T00:00:00Z"),
    });

    expect(slots).toEqual([]);
  });

  it("offers slots from an extra exception even without a matching rule", async () => {
    const { useCase, availabilityRepository } = makeUseCase();
    await availabilityRepository.createException({
      professionalId: PROFESSIONAL_ID,
      date: MONDAY,
      kind: "extra",
      startTime: "14:00",
      endTime: "15:00",
    });

    const slots = await useCase.execute({
      professionalId: PROFESSIONAL_ID,
      timezone: "UTC",
      bufferMinutes: 0,
      date: MONDAY,
      durationMinutes: 60,
      now: new Date("2026-08-01T00:00:00Z"),
    });

    expect(slots).toEqual([{ startsAt: "2026-08-10T14:00:00.000Z", endsAt: "2026-08-10T15:00:00.000Z" }]);
  });

  it("excludes time occupied by an existing booking, padded by buffer_minutes", async () => {
    const { useCase, availabilityRepository, bookingRepository } = makeUseCase();
    await availabilityRepository.createRule({
      professionalId: PROFESSIONAL_ID,
      weekday: 1,
      startTime: "09:00",
      endTime: "13:00",
      effectiveMonth: EFFECTIVE_MONTH,
    });
    await bookingRepository.create({
      professionalId: PROFESSIONAL_ID,
      clientUserId: "client-1",
      serviceVariantId: "variant-1",
      startsAt: new Date("2026-08-10T10:00:00Z"),
      endsAt: new Date("2026-08-10T11:00:00Z"),
      priceClp: 10_000,
      durationMinutes: 60,
    });

    const slots = await useCase.execute({
      professionalId: PROFESSIONAL_ID,
      timezone: "UTC",
      bufferMinutes: 15,
      date: MONDAY,
      durationMinutes: 60,
      now: new Date("2026-08-01T00:00:00Z"),
    });

    expect(slots).toEqual([{ startsAt: "2026-08-10T11:15:00.000Z", endsAt: "2026-08-10T12:15:00.000Z" }]);
  });

  it("does not offer slots less than 2 hours from now", async () => {
    const { useCase, availabilityRepository } = makeUseCase();
    await availabilityRepository.createRule({
      professionalId: PROFESSIONAL_ID,
      weekday: 1,
      startTime: "08:00",
      endTime: "11:00",
      effectiveMonth: EFFECTIVE_MONTH,
    });

    const slots = await useCase.execute({
      professionalId: PROFESSIONAL_ID,
      timezone: "UTC",
      bufferMinutes: 0,
      date: MONDAY,
      durationMinutes: 30,
      now: NOW,
    });

    expect(slots).toEqual([
      { startsAt: "2026-08-10T10:00:00.000Z", endsAt: "2026-08-10T10:30:00.000Z" },
      { startsAt: "2026-08-10T10:30:00.000Z", endsAt: "2026-08-10T11:00:00.000Z" },
    ]);
  });
});
