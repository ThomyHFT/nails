import type { AvailabilityRepository } from "@/server/domain/availability/availability-repository.port";
import type { BookingRepository } from "@/server/domain/booking/booking-repository.port";
import type { Professional } from "@/server/domain/professional/professional.entity";
import { staffForService, type StaffMember, type StaffRepository } from "@/server/domain/staff/staff-member";
import {
  GenerateAvailableSlotsUseCase,
  type AvailableSlot,
  type GenerateAvailableSlotsInput,
} from "@/server/application/booking/generate-available-slots.use-case";
import {
  ListDaysWithSlotsUseCase,
  type ListDaysWithSlotsInput,
} from "@/server/application/booking/list-days-with-slots.use-case";

/**
 * Quiénes pueden atender un servicio (SPEC 22), en el orden del equipo. Con
 * plan Solo, solo la dueña aunque queden integrantes de cuando era Salón.
 * `requestedStaffId` acota a una (la que eligió la clienta); si no la puede
 * atender, la lista queda vacía.
 */
export async function bookableStaff(
  staffRepository: StaffRepository,
  professional: Professional,
  serviceId: string,
  requestedStaffId?: string | null,
): Promise<StaffMember[]> {
  const team = await staffRepository.listByProfessional(professional.id);
  const usable = professional.plan === "salon" ? team : team.filter((staff) => staff.isOwner);
  const eligible = staffForService(usable, serviceId);
  return requestedStaffId ? eligible.filter((staff) => staff.id === requestedStaffId) : eligible;
}

/** Horarios y días del equipo: la unión de los de cada integrante (SPEC 22). */
export class TeamAvailabilityUseCase {
  constructor(
    private readonly availabilityRepository: AvailabilityRepository,
    private readonly bookingRepository: BookingRepository,
  ) {}

  async slots(staffIds: string[], input: Omit<GenerateAvailableSlotsInput, "staffId">): Promise<AvailableSlot[]> {
    const useCase = new GenerateAvailableSlotsUseCase(this.availabilityRepository, this.bookingRepository);
    const perStaff = await Promise.all(staffIds.map((staffId) => useCase.execute({ ...input, staffId })));
    const byStart = new Map<string, AvailableSlot>();
    for (const slot of perStaff.flat()) if (!byStart.has(slot.startsAt)) byStart.set(slot.startsAt, slot);
    return [...byStart.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  /**
   * `fullDays`: alguien atiende ese día pero nadie tiene cupo. Un día en que
   * una integrante está completa y otra libre no es completo.
   */
  async days(
    staffIds: string[],
    input: Omit<ListDaysWithSlotsInput, "staffId">,
  ): Promise<{ days: string[]; fullDays: string[] }> {
    const useCase = new ListDaysWithSlotsUseCase(this.availabilityRepository, this.bookingRepository);
    const perStaff = await Promise.all(staffIds.map((staffId) => useCase.executeDetailed({ ...input, staffId })));
    const days = new Set(perStaff.flatMap((r) => r.days));
    const fullDays = new Set(perStaff.flatMap((r) => r.fullDays).filter((day) => !days.has(day)));
    return { days: [...days].sort(), fullDays: [...fullDays].sort() };
  }
}
