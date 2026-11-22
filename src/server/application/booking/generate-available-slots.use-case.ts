import type { AvailabilityRepository } from "@/server/domain/availability/availability-repository.port";
import type { AvailabilityException } from "@/server/domain/availability/availability-exception.entity";
import type { AvailabilityRule } from "@/server/domain/availability/availability-rule.entity";
import type { Booking } from "@/server/domain/booking/booking.entity";
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

export interface ComputeDaySlotsInput {
  /** Reglas del mes del día; las que no son de este día de la semana se descartan acá. */
  rules: AvailabilityRule[];
  /** Excepciones de este día exacto. */
  exceptions: AvailabilityException[];
  /** Reservas activas que se cruzan con este día. */
  bookings: Booking[];
  timezone: string;
  bufferMinutes: number;
  date: string;
  durationMinutes: number;
  now: Date;
}

/** Inicio y fin (UTC) del día local, el mismo rango que se usa para buscar sus reservas. */
export function dayRangeUtc(date: string, timezone: string): { start: Date; end: Date } {
  return {
    start: zonedDateTimeToUtc(date, "00:00", timezone),
    end: zonedDateTimeToUtc(date, "23:59", timezone),
  };
}

/**
 * Los slots de un día a partir de datos ya cargados. Sin I/O: así el listado
 * mensual puede pedir las reglas, excepciones y reservas del mes una sola vez
 * y calcular los ~30 días en memoria, en vez de ~30 idas y vueltas a la base.
 */
export function computeDaySlots(input: ComputeDaySlotsInput): AvailableSlot[] {
  const { rules, exceptions, bookings, timezone, bufferMinutes, date, durationMinutes, now } = input;
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();

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

  const busyIntervals: MinuteInterval[] = bookings.map((booking) => ({
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

export class GenerateAvailableSlotsUseCase {
  constructor(
    private readonly availabilityRepository: AvailabilityRepository,
    private readonly bookingRepository: BookingRepository,
  ) {}

  async execute(input: GenerateAvailableSlotsInput): Promise<AvailableSlot[]> {
    const { professionalId, timezone, bufferMinutes, date, durationMinutes } = input;
    const now = input.now ?? new Date();
    const effectiveMonth = `${date.slice(0, 7)}-01`;

    const [rules, exceptions] = await Promise.all([
      this.availabilityRepository.listRulesByProfessionalAndMonth(professionalId, effectiveMonth),
      this.availabilityRepository.listExceptionsByProfessionalAndDate(professionalId, date),
    ]);

    // Sin horario abierto no hace falta mirar las reservas del día.
    if (computeDaySlots({ rules, exceptions, bookings: [], timezone, bufferMinutes, date, durationMinutes, now }).length === 0) {
      return [];
    }

    const { start, end } = dayRangeUtc(date, timezone);
    const bookings = await this.bookingRepository.listActiveByProfessionalInRange(professionalId, start, end);

    return computeDaySlots({ rules, exceptions, bookings, timezone, bufferMinutes, date, durationMinutes, now });
  }
}
