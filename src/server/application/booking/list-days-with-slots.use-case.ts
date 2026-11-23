import type { AvailabilityRepository } from "@/server/domain/availability/availability-repository.port";
import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import { computeDaySlots, dayRangeUtc, type SlotPolicy } from "@/server/application/booking/generate-available-slots.use-case";
import { resolveRulesForMonth } from "@/server/domain/availability/resolve-rules-for-month";

export interface ListDaysWithSlotsInput {
  professionalId: string;
  timezone: string;
  bufferMinutes: number;
  month: string; // YYYY-MM-01
  durationMinutes: number;
  now?: Date;
  policy?: SlotPolicy;
}

function daysInMonth(month: string): number {
  const [year, mon] = month.split("-").map(Number);
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}

/**
 * Los días del mes que tienen al menos un slot libre.
 *
 * Carga el mes entero en cuatro consultas en paralelo (reglas del mes,
 * horario semanal, excepciones y reservas activas del rango) y calcula cada día en memoria con `computeDaySlots`, la
 * misma función que usa el cálculo de un solo día. Antes llamaba a
 * `GenerateAvailableSlotsUseCase` día por día: ~30 idas y vueltas en serie a
 * Neon y 4-5 segundos de "Cargando…" en el primer paso de la reserva.
 */
export class ListDaysWithSlotsUseCase {
  constructor(
    private readonly availabilityRepository: AvailabilityRepository,
    private readonly bookingRepository: BookingRepository,
  ) {}

  async execute(input: ListDaysWithSlotsInput): Promise<string[]> {
    const { professionalId, timezone, bufferMinutes, month, durationMinutes } = input;
    const now = input.now ?? new Date();

    const [year, mon] = month.split("-").map(Number);
    const total = daysInMonth(month);
    const dateOf = (day: number) => `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const monthStart = dayRangeUtc(dateOf(1), timezone).start;
    const monthEnd = dayRangeUtc(dateOf(total), timezone).end;

    const [monthRules, weeklyRules, exceptions, bookings] = await Promise.all([
      this.availabilityRepository.listRulesByProfessionalAndMonth(professionalId, month),
      this.availabilityRepository.listRulesByProfessionalAndMonth(professionalId, null),
      this.availabilityRepository.listExceptionsByProfessionalInMonth(professionalId, month),
      this.bookingRepository.listActiveByProfessionalInRange(professionalId, monthStart, monthEnd),
    ]);
    const rules = resolveRulesForMonth(monthRules, weeklyRules);

    // Sin reglas ni horarios extra el mes no tiene nada abierto: no hace falta
    // recorrer los días.
    if (rules.length === 0 && !exceptions.some((exception) => exception.kind === "extra")) {
      return [];
    }

    const days: string[] = [];

    for (let day = 1; day <= total; day++) {
      const date = dateOf(day);
      const { start, end } = dayRangeUtc(date, timezone);

      const slots = computeDaySlots({
        rules,
        exceptions: exceptions.filter((exception) => exception.date === date),
        // El mismo criterio de cruce que usa la consulta por día.
        bookings: bookings.filter((booking) => booking.startsAt < end && booking.endsAt > start),
        timezone,
        bufferMinutes,
        date,
        durationMinutes,
        now,
        policy: input.policy,
      });

      if (slots.length > 0) days.push(date);
    }

    return days;
  }
}
