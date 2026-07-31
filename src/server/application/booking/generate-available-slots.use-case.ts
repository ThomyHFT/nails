import type { AvailabilityRepository } from "@/server/domain/availability/availability-repository.port";
import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import { mergeIntervals, subtractIntervals, type MinuteInterval } from "@/server/application/booking/intervals";
import { minutesToTime, timeToMinutes, utcToZonedMinutesOfDay, zonedDateTimeToUtc } from "@/server/application/booking/zoned-time";

const MINIMUM_LEAD_TIME_MS = 2 * 60 * 60 * 1000;

export interface AvailableSlot {
  startsAt: string;
  endsAt: string;
}

export interface GenerateAvailableSlotsInput {
  professionalId: string;
  timezone: string;
  bufferMinutes: number;
  date: string;
  durationMinutes: number;
  now?: Date;
}

export class GenerateAvailableSlotsUseCase {
  constructor(
    private readonly availabilityRepository: AvailabilityRepository,
    private readonly bookingRepository: BookingRepository,
  ) {}

  async execute(input: GenerateAvailableSlotsInput): Promise<AvailableSlot[]> {
    const { professionalId, timezone, bufferMinutes, date, durationMinutes } = input;
    const now = input.now ?? new Date();

    const effectiveMonth = `${date.slice(0, 7)}-01`;
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();

    const [rules, exceptions] = await Promise.all([
      this.availabilityRepository.listRulesByProfessionalAndMonth(professionalId, effectiveMonth),
      this.availabilityRepository.listExceptionsByProfessionalAndDate(professionalId, date),
    ]);

    const isBlocked = exceptions.some((exception) => exception.kind === "blocked");

    const baseIntervals: MinuteInterval[] = isBlocked
      ? []
      : rules
          .filter((rule) => rule.active && rule.weekday === weekday)
          .map((rule) => ({ start: timeToMinutes(rule.startTime), end: timeToMinutes(rule.endTime) }));

    const extraIntervals: MinuteInterval[] = exceptions
      .filter((exception) => exception.kind === "extra" && exception.startTime && exception.endTime)
      .map((exception) => ({
        start: timeToMinutes(exception.startTime as string),
        end: timeToMinutes(exception.endTime as string),
      }));

    const openIntervals = mergeIntervals([...baseIntervals, ...extraIntervals]);
    if (openIntervals.length === 0) return [];

    const dayStart = zonedDateTimeToUtc(date, "00:00", timezone);
    const dayEnd = zonedDateTimeToUtc(date, "23:59", timezone);
    const existingBookings = await this.bookingRepository.listActiveByProfessionalInRange(
      professionalId,
      dayStart,
      dayEnd,
    );

    const busyIntervals: MinuteInterval[] = existingBookings.map((booking) => ({
      start: utcToZonedMinutesOfDay(booking.startsAt, timezone) - bufferMinutes,
      end: utcToZonedMinutesOfDay(booking.endsAt, timezone) + bufferMinutes,
    }));

    const freeIntervals = subtractIntervals(openIntervals, busyIntervals);
    const cutoff = new Date(now.getTime() + MINIMUM_LEAD_TIME_MS);
    const slots: AvailableSlot[] = [];

    for (const interval of freeIntervals) {
      let slotStart = interval.start;
      while (slotStart + durationMinutes <= interval.end) {
        const startsAt = zonedDateTimeToUtc(date, minutesToTime(slotStart), timezone);
        const endsAt = zonedDateTimeToUtc(date, minutesToTime(slotStart + durationMinutes), timezone);
        if (startsAt >= cutoff) {
          slots.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
        }
        slotStart += durationMinutes;
      }
    }

    return slots;
  }
}
