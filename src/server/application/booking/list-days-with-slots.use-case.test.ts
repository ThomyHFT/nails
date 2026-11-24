import { describe, expect, it, vi } from "vitest";
import { InMemoryAvailabilityRepository } from "@/server/application/booking/__fakes__/in-memory-availability-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { GenerateAvailableSlotsUseCase } from "@/server/application/booking/generate-available-slots.use-case";
import { ListDaysWithSlotsUseCase } from "@/server/application/booking/list-days-with-slots.use-case";

const PROFESSIONAL_ID = "prof-1";
const MONTH = "2026-08-01"; // agosto 2026: lunes son 3, 10, 17, 24, 31
// Reloj fijo antes de agosto 2026: sin esto el caso de uso usa la hora real y descarta los slots como pasados.
const NOW = new Date("2026-08-01T00:00:00Z");

function makeUseCase() {
  const availabilityRepository = new InMemoryAvailabilityRepository();
  const bookingRepository = new InMemoryBookingRepository();
  const useCase = new ListDaysWithSlotsUseCase(availabilityRepository, bookingRepository);
  return { useCase, availabilityRepository, bookingRepository };
}

describe("ListDaysWithSlotsUseCase", () => {
  it("returns an empty list when the month has no availability rules loaded", async () => {
    const { useCase } = makeUseCase();

    const days = await useCase.execute({
      professionalId: PROFESSIONAL_ID,
      timezone: "UTC",
      staffId: "staff-1",
      bufferMinutes: 0,
      month: MONTH,
      durationMinutes: 60,
      now: NOW,
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
      staffId: "staff-1",
      bufferMinutes: 0,
      month: MONTH,
      durationMinutes: 60,
      now: NOW,
    });

    expect(days).toEqual(["2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31"]);
  });

  it("drops a day blocked by an exception", async () => {
    const { useCase, availabilityRepository } = makeUseCase();
    await availabilityRepository.createRule({ professionalId: PROFESSIONAL_ID, weekday: 1, startTime: "09:00", endTime: "12:00", effectiveMonth: MONTH });
    await availabilityRepository.createException({ professionalId: PROFESSIONAL_ID, date: "2026-08-10", kind: "blocked" });

    const days = await useCase.execute({ professionalId: PROFESSIONAL_ID, staffId: "staff-1", timezone: "UTC", bufferMinutes: 0, month: MONTH, durationMinutes: 60, now: NOW });

    expect(days).toEqual(["2026-08-03", "2026-08-17", "2026-08-24", "2026-08-31"]);
  });

  it("adds a day opened by an extra exception even without rules", async () => {
    const { useCase, availabilityRepository } = makeUseCase();
    await availabilityRepository.createException({ professionalId: PROFESSIONAL_ID, date: "2026-08-15", kind: "extra", startTime: "10:00", endTime: "12:00" });

    const days = await useCase.execute({ professionalId: PROFESSIONAL_ID, staffId: "staff-1", timezone: "UTC", bufferMinutes: 0, month: MONTH, durationMinutes: 60, now: NOW });

    expect(days).toEqual(["2026-08-15"]);
  });

  it("drops a day whose only slot is already booked", async () => {
    const { useCase, availabilityRepository, bookingRepository } = makeUseCase();
    await availabilityRepository.createRule({ professionalId: PROFESSIONAL_ID, weekday: 1, startTime: "09:00", endTime: "10:00", effectiveMonth: MONTH });
    await bookingRepository.create({
      professionalId: PROFESSIONAL_ID,
      clientUserId: "client-1",
      serviceVariantId: "variant-1",
      startsAt: new Date("2026-08-17T09:00:00Z"),
      endsAt: new Date("2026-08-17T10:00:00Z"),
      priceClp: 15_000,
      durationMinutes: 60,
    });

    const days = await useCase.execute({ professionalId: PROFESSIONAL_ID, staffId: "staff-1", timezone: "UTC", bufferMinutes: 0, month: MONTH, durationMinutes: 60, now: NOW });

    expect(days).toEqual(["2026-08-03", "2026-08-10", "2026-08-24", "2026-08-31"]);

    // SPEC 21: el lunes ocupado es un día completo (admite lista de espera); los martes, cerrados, no.
    const detailed = await useCase.executeDetailed({ professionalId: PROFESSIONAL_ID, staffId: "staff-1", timezone: "UTC", bufferMinutes: 0, month: MONTH, durationMinutes: 60, now: NOW });
    expect(detailed.fullDays).toEqual(["2026-08-17"]);
  });

  it("agrees day by day with the single-day slot calculation", async () => {
    const { useCase, availabilityRepository, bookingRepository } = makeUseCase();
    await availabilityRepository.createRule({ professionalId: PROFESSIONAL_ID, weekday: 2, startTime: "09:00", endTime: "11:00", effectiveMonth: MONTH });
    await availabilityRepository.createRule({ professionalId: PROFESSIONAL_ID, weekday: 4, startTime: "14:00", endTime: "15:00", effectiveMonth: MONTH });
    await availabilityRepository.createException({ professionalId: PROFESSIONAL_ID, date: "2026-08-11", kind: "blocked" });
    await availabilityRepository.createException({ professionalId: PROFESSIONAL_ID, date: "2026-08-22", kind: "extra", startTime: "10:00", endTime: "11:00" });
    await bookingRepository.create({
      professionalId: PROFESSIONAL_ID,
      clientUserId: "client-1",
      serviceVariantId: "variant-1",
      startsAt: new Date("2026-08-13T14:00:00Z"),
      endsAt: new Date("2026-08-13T15:00:00Z"),
      priceClp: 15_000,
      durationMinutes: 60,
    });
    const input = { professionalId: PROFESSIONAL_ID, staffId: "staff-1", timezone: "America/Santiago", bufferMinutes: 15, durationMinutes: 60, now: NOW };

    const days = await useCase.execute({ ...input, month: MONTH });

    const single = new GenerateAvailableSlotsUseCase(availabilityRepository, bookingRepository);
    const expected: string[] = [];
    for (let day = 1; day <= 31; day++) {
      const date = `2026-08-${String(day).padStart(2, "0")}`;
      if ((await single.execute({ ...input, date })).length > 0) expected.push(date);
    }
    expect(days).toEqual(expected);
    expect(days.length).toBeGreaterThan(0);
  });

  it("loads the month with a fixed number of queries instead of one per day", async () => {
    const { useCase, availabilityRepository, bookingRepository } = makeUseCase();
    await availabilityRepository.createRule({ professionalId: PROFESSIONAL_ID, weekday: 1, startTime: "09:00", endTime: "12:00", effectiveMonth: MONTH });
    const spies = [
      vi.spyOn(availabilityRepository, "listRules"),
      vi.spyOn(availabilityRepository, "listExceptionsInMonth"),
      vi.spyOn(availabilityRepository, "listExceptionsByDate"),
      vi.spyOn(bookingRepository, "listActiveByStaffInRange"),
    ];

    await useCase.execute({ professionalId: PROFESSIONAL_ID, staffId: "staff-1", timezone: "UTC", bufferMinutes: 0, month: MONTH, durationMinutes: 60, now: NOW });

    // Reglas del mes + horario semanal + excepciones del mes + reservas del rango.
    expect(spies.reduce((total, spy) => total + spy.mock.calls.length, 0)).toBe(4);
  });
});
