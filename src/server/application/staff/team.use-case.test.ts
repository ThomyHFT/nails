import { describe, expect, it } from "vitest";
import { makeProfessional } from "@/server/application/admin/__fakes__/professional-fixture";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { InMemoryProfessionalRepository } from "@/server/application/professional/__fakes__/in-memory-professional-repository";
import { InMemoryServicesRepository } from "@/server/application/service/__fakes__/in-memory-services-repository";
import { InMemoryStaffRepository } from "@/server/application/staff/__fakes__/in-memory-staff-repository";
import { SetPlanUseCase, TeamError, TeamUseCase } from "@/server/application/staff/team.use-case";

async function setup(plan: "solo" | "salon" = "salon", staffLimit = 3) {
  const staff = new InMemoryStaffRepository();
  const users = new InMemoryUserRepository();
  const services = new InMemoryServicesRepository();
  const professionals = new InMemoryProfessionalRepository();
  const professional = makeProfessional({ id: "prof-1", plan, staffLimit });
  professionals.professionals.push(professional);
  const owner = await staff.create({ professionalId: "prof-1", name: "Fran", isOwner: true, userId: "owner-user" });
  return { staff, users, services, professionals, professional, owner, team: new TeamUseCase(staff, users, services) };
}

describe("TeamUseCase (SPEC 22)", () => {
  it("adds members up to the plan limit and refuses without Salón", async () => {
    const { team, professional } = await setup("salon", 3);
    await team.add(professional, { name: "Ana" });
    await team.add(professional, { name: "Bea" });
    await expect(team.add(professional, { name: "Caro" })).rejects.toThrow("permite 3");

    const solo = await setup("solo", 1);
    await expect(solo.team.add(solo.professional, { name: "Ana" })).rejects.toThrow(TeamError);
  });

  it("creates a passwordless staff user for access and refuses an email already in use", async () => {
    const { team, professional, users } = await setup();
    const ana = await team.add(professional, { name: "Ana", email: " ANA@x.cl " });
    const user = await users.findByEmail("ana@x.cl");
    expect(user?.role).toBe("staff");
    expect(ana.userId).toBe(user?.id);

    await users.create({ email: "cliente@x.cl", passwordHash: "h", name: "C", role: "client" });
    await expect(team.add(professional, { name: "Bea", email: "cliente@x.cl" })).rejects.toThrow("ya tiene una cuenta");
  });

  it("never deactivates the owner and checks room when reactivating", async () => {
    const { team, professional, owner } = await setup("salon", 2);
    await expect(team.update(professional, owner.id, { active: false })).rejects.toThrow("dueña");
    const ana = await team.add(professional, { name: "Ana" });
    await team.update(professional, ana.id, { active: false });
    await team.add(professional, { name: "Bea" });
    await expect(team.update(professional, ana.id, { active: true })).rejects.toThrow("permite 2");
  });

  it("only accepts the professional's own services", async () => {
    const { team, professional, services } = await setup();
    const mine = await services.createService({ professionalId: "prof-1", name: "Manicure" });
    const ana = await team.add(professional, { name: "Ana" });
    const updated = await team.update(professional, ana.id, { allServices: false, serviceIds: [mine.id] });
    expect(updated.allServices).toBe(false);
    expect(updated.serviceIds).toEqual([mine.id]);
    await expect(team.update(professional, ana.id, { serviceIds: ["ajeno"] })).rejects.toThrow("Servicio");
  });

  it("reassigns a booking only to a free, active member of the same business", async () => {
    const { team, professional, owner } = await setup();
    const bookings = new InMemoryBookingRepository();
    const ana = await team.add(professional, { name: "Ana" });
    const start = new Date("2026-08-10T09:00:00Z");
    const end = new Date("2026-08-10T10:00:00Z");
    const base = { professionalId: "prof-1", serviceVariantId: "v", startsAt: start, endsAt: end, priceClp: 1, durationMinutes: 60 };
    const mine = await bookings.create({ ...base, clientUserId: "c-1", staffId: owner.id });
    expect((await team.reassign(professional, bookings, mine.id, ana.id)).staffId).toBe(ana.id);

    const other = await bookings.create({ ...base, clientUserId: "c-2", staffId: owner.id });
    await expect(team.reassign(professional, bookings, other.id, ana.id)).rejects.toThrow("ya tiene una reserva");
    await expect(team.reassign(makeProfessional({ id: "prof-2", plan: "salon" }), bookings, other.id, ana.id)).rejects.toThrow(
      "Reserva no encontrada",
    );
  });
});

describe("SetPlanUseCase (SPEC 22)", () => {
  it("validates the limit and deactivates the extras when lowering it", async () => {
    const { staff, professionals, professional, team } = await setup("salon", 4);
    const ana = await team.add(professional, { name: "Ana" });
    const bea = await team.add(professional, { name: "Bea" });
    const setPlan = new SetPlanUseCase(professionals, staff);
    await expect(setPlan.execute("prof-1", "salon", 9)).rejects.toThrow(TeamError);

    await setPlan.execute("prof-1", "salon", 2);
    expect((await staff.findById(ana.id, "prof-1"))?.active).toBe(true);
    expect((await staff.findById(bea.id, "prof-1"))?.active).toBe(false);

    const solo = await setPlan.execute("prof-1", "solo", 5);
    expect(solo.staffLimit).toBe(1);
    expect((await staff.findById(ana.id, "prof-1"))?.active).toBe(false);
    expect((await staff.findOwner("prof-1"))?.active).toBe(true);
  });
});
