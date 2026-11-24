import type { AvailabilityRepository } from "@/server/domain/availability/availability-repository.port";
import type { AvailabilityException } from "@/server/domain/availability/availability-exception.entity";
import type { AvailabilityRule } from "@/server/domain/availability/availability-rule.entity";
import { resolveRulesForMonth } from "@/server/domain/availability/resolve-rules-for-month";
import type { Booking } from "@/server/domain/booking/booking.entity";
import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import { DEFAULT_BOOKING_POLICY, type BookingPolicy } from "@/server/domain/professional/booking-policy";
import { mergeIntervals, subtractIntervals, type MinuteInterval } from "@/server/application/booking/intervals";
import { minutesToTime, timeToMinutes, utcToZonedMinutesOfDay, zonedDateTimeToUtc } from "@/server/application/booking/zoned-time";

/** Las reglas que afectan qué horarios se ofrecen (SPEC 19). */
export type SlotPolicy = Pick<BookingPolicy, "slotIntervalMinutes" | "minLeadMinutes" | "maxAdvanceDays">;

export interface AvailableSlot {
  startsAt: string;
  endsAt: string;
}

export interface GenerateAvailableSlotsInput {
  professionalId: string;
  /** De quién es la agenda (SPEC 22): horario, bloqueos y reservas son por integrante. */
  staffId: string;
  timezone: string;
  bufferMinutes: number;
  date: string;
  durationMinutes: number;
  now?: Date;
  /** Por defecto, las reglas de siempre: cada duración, 2 h de antelación, sin límite hacia adelante. */
  policy?: SlotPolicy;
  /** Reserva que no cuenta como ocupada: la que se está reagendando (SPEC 19). */
  excludeBookingId?: string;
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
  policy?: SlotPolicy;
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
  const policy = input.policy ?? DEFAULT_BOOKING_POLICY;
  const step = policy.slotIntervalMinutes ?? durationMinutes;
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();

  // Un bloqueo sin horas tapa el día; con horas, solo ese rango (SPEC 18).
  const isBlocked = exceptions.some(
    (exception) => exception.kind === "blocked" && !(exception.startTime && exception.endTime),
  );
  const blockedIntervals: MinuteInterval[] = exceptions
    .filter((exception) => exception.kind === "blocked" && exception.startTime && exception.endTime)
    .map((exception) => ({
      start: timeToMinutes(exception.startTime as string),
      end: timeToMinutes(exception.endTime as string),
    }));

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

  const freeIntervals = subtractIntervals(openIntervals, [...busyIntervals, ...blockedIntervals]);
  const cutoff = new Date(now.getTime() + policy.minLeadMinutes * 60_000);
  const latest =
    policy.maxAdvanceDays === null ? null : new Date(now.getTime() + policy.maxAdvanceDays * 24 * 60 * 60_000);
  const slots: AvailableSlot[] = [];

  for (const interval of freeIntervals) {
    let slotStart = interval.start;
    while (slotStart + durationMinutes <= interval.end) {
      const startsAt = zonedDateTimeToUtc(date, minutesToTime(slotStart), timezone);
      const endsAt = zonedDateTimeToUtc(date, minutesToTime(slotStart + durationMinutes), timezone);
      if (startsAt >= cutoff && (latest === null || startsAt <= latest)) {
        slots.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
      }
      slotStart += step;
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
    const { staffId, timezone, bufferMinutes, date, durationMinutes, policy } = input;
    const now = input.now ?? new Date();
    const effectiveMonth = `${date.slice(0, 7)}-01`;

    const [monthRules, weeklyRules, exceptions] = await Promise.all([
      this.availabilityRepository.listRules(staffId, effectiveMonth),
      this.availabilityRepository.listRules(staffId, null),
      this.availabilityRepository.listExceptionsByDate(staffId, date),
    ]);
    const rules = resolveRulesForMonth(monthRules, weeklyRules);

    // Sin horario abierto no hace falta mirar las reservas del día.
    const base = { rules, exceptions, timezone, bufferMinutes, date, durationMinutes, now, policy };
    if (computeDaySlots({ ...base, bookings: [] }).length === 0) {
      return [];
    }

    const { start, end } = dayRangeUtc(date, timezone);
    const bookings = (await this.bookingRepository.listActiveByStaffInRange(staffId, start, end)).filter(
      (booking) => booking.id !== input.excludeBookingId,
    );

    return computeDaySlots({ ...base, bookings });
  }
}
