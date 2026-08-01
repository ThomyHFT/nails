import type { AvailabilityRepository } from "@/server/domain/availability/availability-repository.port";
import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import { GenerateAvailableSlotsUseCase } from "@/server/application/booking/generate-available-slots.use-case";

export interface ListDaysWithSlotsInput {
  professionalId: string;
  timezone: string;
  bufferMinutes: number;
  month: string; // YYYY-MM-01
  durationMinutes: number;
  now?: Date;
}

function daysInMonth(month: string): number {
  const [year, mon] = month.split("-").map(Number);
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}

export class ListDaysWithSlotsUseCase {
  constructor(
    private readonly availabilityRepository: AvailabilityRepository,
    private readonly bookingRepository: BookingRepository,
  ) {}

  async execute(input: ListDaysWithSlotsInput): Promise<string[]> {
    const { professionalId, timezone, bufferMinutes, month, durationMinutes, now } = input;
    const generateSlots = new GenerateAvailableSlotsUseCase(this.availabilityRepository, this.bookingRepository);

    const [year, mon] = month.split("-").map(Number);
    const total = daysInMonth(month);
    const days: string[] = [];

    for (let day = 1; day <= total; day++) {
      const date = `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const slots = await generateSlots.execute({
        professionalId,
        timezone,
        bufferMinutes,
        date,
        durationMinutes,
        now,
      });
      if (slots.length > 0) days.push(date);
    }

    return days;
  }
}
