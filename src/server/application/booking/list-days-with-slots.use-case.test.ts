import { describe, expect, it } from "vitest";
import { InMemoryAvailabilityRepository } from "@/server/application/booking/__fakes__/in-memory-availability-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { ListDaysWithSlotsUseCase } from "@/server/application/booking/list-days-with-slots.use-case";

const PROFESSIONAL_ID = "prof-1";
const MONTH = "2026-08-01"; // agosto 2026: lunes son 3, 10, 17, 24, 31

function makeUseCase() {
  const availabilityRepository = new InMemoryAvailabilityRepository();
  const bookingRepository = new InMemoryBookingRepository();
  const useCase = new ListDaysWithSlotsUseCase(availabilityRepository, bookingRepository);
  return { useCase, availabilityRepository };
}

describe("ListDaysWithSlotsUseCase", () => {
  it("returns an empty list when the month has no availability rules loaded", async () => {
    const { useCase } = makeUseCase();

    const days = await useCase.execute({
      professionalId: PROFESSIONAL_ID,
      timezone: "UTC",
      bufferMinutes: 0,
      month: MONTH,
      durationMinutes: 60,
    });

    expect(days).toEqual([]);
  });

  it("returns only the days matching the configured weekdays", async () => {
    const { useCase, availabilityRepository } = makeUseCase();
    await availabilityRepository.createRule({
      professionalId: PROFESSIONAL_ID,
      weekday: 1, // lunes
      startTime: "09:00",
      endTime: "12:00",
      effectiveMonth: MONTH,
    });

    const days = await useCase.execute({
      professionalId: PROFESSIONAL_ID,
      timezone: "UTC",
      bufferMinutes: 0,
      month: MONTH,
      durationMinutes: 60,
    });

    expect(days).toEqual(["2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31"]);
  });
});
