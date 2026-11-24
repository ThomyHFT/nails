import type { NewStaffMember, StaffMember, StaffPatch, StaffRepository } from "@/server/domain/staff/staff-member";

export class InMemoryStaffRepository implements StaffRepository {
  readonly staff: StaffMember[] = [];
  private nextId = 1;

  async listByProfessional(professionalId: string) {
    return this.staff
      .filter((s) => s.professionalId === professionalId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async findById(id: string, professionalId: string) {
    return this.staff.find((s) => s.id === id && s.professionalId === professionalId) ?? null;
  }

  async findByUserId(userId: string) {
    return this.staff.find((s) => s.userId === userId) ?? null;
  }

  async findOwner(professionalId: string) {
    return this.staff.find((s) => s.professionalId === professionalId && s.isOwner) ?? null;
  }

  async create(input: NewStaffMember) {
    if (input.userId && this.staff.some((s) => s.userId === input.userId)) throw new Error("duplicate user");
    const created: StaffMember = {
      id: `staff-${this.nextId++}`,
      professionalId: input.professionalId,
      userId: input.userId ?? null,
      name: input.name,
      isOwner: input.isOwner ?? false,
      active: true,
      allServices: true,
      serviceIds: [],
      sortOrder: input.sortOrder ?? this.staff.length,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, this.nextId)),
    };
    this.staff.push(created);
    return created;
  }

  async update(id: string, professionalId: string, patch: StaffPatch) {
    const staff = await this.findById(id, professionalId);
    if (!staff) return null;
    Object.assign(staff, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
    return staff;
  }

  async setServices(id: string, serviceIds: string[]) {
    const staff = this.staff.find((s) => s.id === id);
    if (staff) staff.serviceIds = [...serviceIds];
  }
}
