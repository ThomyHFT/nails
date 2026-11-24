import { describe, expect, it } from "vitest";
import { makeProfessional } from "@/server/application/admin/__fakes__/professional-fixture";
import { InMemoryAvailabilityRepository } from "@/server/application/booking/__fakes__/in-memory-availability-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { InMemoryDesignRepository } from "@/server/application/design/__fakes__/in-memory-design-repository";
import { CreateBookingUseCase, SlotNotAvailableError } from "@/server/application/booking/create-booking.use-case";
import { RescheduleBookingUseCase } from "@/server/application/booking/reschedule-booking.use-case";
import { BookingNotOwnedError } from "@/server/application/booking/booking-guard-errors";
import { InMemoryProfessionalRepository } from "@/server/application/professional/__fakes__/in-memory-professional-repository";
import { InMemoryStaffRepository } from "@/server/application/staff/__fakes__/in-memory-staff-repository";
import { bookableStaff, TeamAvailabilityUseCase } from "@/server/application/staff/team-availability.use-case";
import { BookingSlotTakenError } from "@/server/domain/booking/booking-repository.port";
import { canManageBooking } from "@/server/domain/staff/booking-manager";

const NOW = new Date("2026-08-01T00:00:00Z");
const MONDAY = "2026-08-10";
const salon = makeProfessional({ id: "prof-1", plan: "salon", staffLimit: 3, timezone: "UTC", bufferMinutes: 0 });

async function setup() {
  const staffRepo = new InMemoryStaffRepository();
  const availability = new InMemoryAvailabilityRepository();
  const bookings = new InMemoryBookingRepository();
  const owner = await staffRepo.create({ professionalId: "prof-1", name: "Fran", isOwner: true, sortOrder: 0 });
  const ana = await staffRepo.create({ professionalId: "prof-1", name: "Ana", sortOrder: 1 });
  // Fran atiende 9-10, Ana 9-11.
  await availability.createRule({ professionalId: "prof-1", staffId: owner.id, weekday: 1, startTime: "09:00", endTime: "10:00", effectiveMonth: null });
  await availability.createRule({ professionalId: "prof-1", staffId: ana.id, weekday: 1, startTime: "09:00", endTime: "11:00", effectiveMonth: null });
  const create = (staffIds: string[], startsAt: string, clientUserId = "c-1") =>
    new CreateBookingUseCase(availability, bookings, new InMemoryDesignRepository()).execute({
      professionalId: "prof-1",
      staffIds,
      professionalVertical: "nails",
      timezone: "UTC",
      bufferMinutes: 0,
      clientUserId,
      serviceVariantId: "v-1",
      date: MONDAY,
      startsAt,
      priceClp: 10_000,
      durationMinutes: 60,
      now: NOW,
    });
  return { staffRepo, availability, bookings, owner, ana, create };
}

const slotInput = {
  professionalId: "prof-1",
  timezone: "UTC",
  bufferMinutes: 0,
  date: MONDAY,
  durationMinutes: 60,
  now: NOW,
};

describe("Plan Salón (SPEC 22)", () => {
  it("offers the union of the team's slots", async () => {
    const { availability, bookings, owner, ana } = await setup();
    const slots = await new TeamAvailabilityUseCase(availability, bookings).slots([owner.id, ana.id], slotInput);
    expect(slots.map((s) => s.startsAt)).toEqual(["2026-08-10T09:00:00.000Z", "2026-08-10T10:00:00.000Z"]);
  });

  it("assigns 'sin preferencia' to the first free member and lets two members share an hour", async () => {
    const { owner, ana, create } = await setup();
    const first = await create([owner.id, ana.id], "2026-08-10T09:00:00.000Z", "c-1");
    expect(first.staffId).toBe(owner.id);
    const second = await create([owner.id, ana.id], "2026-08-10T09:00:00.000Z", "c-2");
    expect(second.staffId).toBe(ana.id);
    await expect(create([owner.id, ana.id], "2026-08-10T09:00:00.000Z", "c-3")).rejects.toThrow(SlotNotAvailableError);
  });

  it("respects a chosen member's schedule", async () => {
    const { owner, create } = await setup();
    await expect(create([owner.id], "2026-08-10T10:00:00.000Z")).rejects.toThrow(SlotNotAvailableError);
  });

  it("marks a day full only when nobody has room", async () => {
    const { availability, bookings, owner, ana, create } = await setup();
    await create([owner.id], "2026-08-10T09:00:00.000Z");
    const team = new TeamAvailabilityUseCase(availability, bookings);
    const month = { ...slotInput, month: "2026-08-01" };
    expect((await team.days([owner.id, ana.id], month)).fullDays).not.toContain(MONDAY);
    expect((await team.days([owner.id], month)).fullDays).toContain(MONDAY);
  });

  it("lists bookable staff by service, active state and plan", async () => {
    const { staffRepo, owner, ana } = await setup();
    await staffRepo.update(ana.id, "prof-1", { allServices: false });
    await staffRepo.setServices(ana.id, ["svc-nails"]);
    expect((await bookableStaff(staffRepo, salon, "svc-nails")).map((s) => s.id)).toEqual([owner.id, ana.id]);
    expect((await bookableStaff(staffRepo, salon, "svc-pedi")).map((s) => s.id)).toEqual([owner.id]);
    expect((await bookableStaff(staffRepo, salon, "svc-nails", ana.id)).map((s) => s.id)).toEqual([ana.id]);
    expect(await bookableStaff(staffRepo, salon, "svc-pedi", ana.id)).toEqual([]);
    // Con plan Solo solo atiende la dueña, aunque queden integrantes.
    expect((await bookableStaff(staffRepo, { ...salon, plan: "solo" }, "svc-nails")).map((s) => s.id)).toEqual([owner.id]);
    await staffRepo.update(owner.id, "prof-1", { active: false });
    expect((await bookableStaff(staffRepo, salon, "svc-pedi")).map((s) => s.id)).toEqual([]);
  });

  it("refuses reassigning to a member who is busy at that hour", async () => {
    const { owner, ana, create, bookings } = await setup();
    const mine = await create([owner.id], "2026-08-10T09:00:00.000Z", "c-1");
    await create([ana.id], "2026-08-10T09:00:00.000Z", "c-2");
    await expect(bookings.reassign(mine.id, ana.id, ["pending", "confirmed"])).rejects.toThrow(BookingSlotTakenError);
  });

  it("lets a member reschedule only her own bookings", async () => {
    const { owner, ana, create, bookings, availability } = await setup();
    const professionals = new InMemoryProfessionalRepository();
    professionals.professionals.push(salon);
    const mine = await create([owner.id], "2026-08-10T09:00:00.000Z");
    const useCase = new RescheduleBookingUseCase(bookings, availability, professionals);
    await expect(
      useCase.execute({ bookingId: mine.id, actor: { kind: "staff", staffId: ana.id }, date: MONDAY, time: "10:00", now: NOW }),
    ).rejects.toThrow(BookingNotOwnedError);
    const moved = await useCase.execute({
      bookingId: mine.id,
      actor: { kind: "staff", staffId: owner.id },
      date: MONDAY,
      time: "10:00",
      now: NOW,
    });
    expect(moved.booking.startsAt.toISOString()).toBe("2026-08-10T10:00:00.000Z");
  });

  it("canManageBooking: the owner manages all, a member only hers, nobody another tenant's", () => {
    const booking = { professionalId: "prof-1", staffId: "s-ana" };
    const owner = { kind: "owner" as const, professional: salon };
    const ana = { kind: "staff" as const, professional: salon, staff: { id: "s-ana" } as never };
    const other = { kind: "staff" as const, professional: salon, staff: { id: "s-otra" } as never };
    expect(canManageBooking(owner, booking)).toBe(true);
    expect(canManageBooking(ana, booking)).toBe(true);
    expect(canManageBooking(other, booking)).toBe(false);
    expect(canManageBooking(owner, { ...booking, professionalId: "prof-2" })).toBe(false);
  });
});
