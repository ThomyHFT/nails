import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { staffMembers, staffServices } from "@/server/infrastructure/db/schema/staff";
import type { NewStaffMember, StaffMember, StaffPatch, StaffRepository } from "@/server/domain/staff/staff-member";

type Row = typeof staffMembers.$inferSelect;

async function withServices(rows: Row[]): Promise<StaffMember[]> {
  if (rows.length === 0) return [];
  const links = await db
    .select()
    .from(staffServices)
    .where(inArray(staffServices.staffId, rows.map((r) => r.id)));
  return rows.map((row) => ({
    id: row.id,
    professionalId: row.professionalId,
    userId: row.userId,
    name: row.name,
    isOwner: row.isOwner,
    active: row.active,
    allServices: row.allServices,
    serviceIds: links.filter((l) => l.staffId === row.id).map((l) => l.serviceId),
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  }));
}

async function one(rows: Row[]): Promise<StaffMember | null> {
  return rows[0] ? (await withServices([rows[0]]))[0] : null;
}

export class DrizzleStaffRepository implements StaffRepository {
  async listByProfessional(professionalId: string): Promise<StaffMember[]> {
    const rows = await db
      .select()
      .from(staffMembers)
      .where(eq(staffMembers.professionalId, professionalId))
      .orderBy(asc(staffMembers.sortOrder), asc(staffMembers.createdAt));
    return withServices(rows);
  }

  async findById(id: string, professionalId: string): Promise<StaffMember | null> {
    return one(
      await db
        .select()
        .from(staffMembers)
        .where(and(eq(staffMembers.id, id), eq(staffMembers.professionalId, professionalId)))
        .limit(1),
    );
  }

  async findByUserId(userId: string): Promise<StaffMember | null> {
    return one(await db.select().from(staffMembers).where(eq(staffMembers.userId, userId)).limit(1));
  }

  async findOwner(professionalId: string): Promise<StaffMember | null> {
    return one(
      await db
        .select()
        .from(staffMembers)
        .where(and(eq(staffMembers.professionalId, professionalId), eq(staffMembers.isOwner, true)))
        .limit(1),
    );
  }

  async create(staff: NewStaffMember): Promise<StaffMember> {
    const [row] = await db
      .insert(staffMembers)
      .values({
        professionalId: staff.professionalId,
        name: staff.name,
        userId: staff.userId ?? null,
        isOwner: staff.isOwner ?? false,
        sortOrder: staff.sortOrder ?? 0,
      })
      .returning();
    return (await one([row]))!;
  }

  async update(id: string, professionalId: string, patch: StaffPatch): Promise<StaffMember | null> {
    const values = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (Object.keys(values).length === 0) return this.findById(id, professionalId);
    return one(
      await db
        .update(staffMembers)
        .set(values)
        .where(and(eq(staffMembers.id, id), eq(staffMembers.professionalId, professionalId)))
        .returning(),
    );
  }

  // neon-http no tiene transacciones interactivas: db.batch borra e inserta de una.
  async setServices(id: string, serviceIds: string[]): Promise<void> {
    const remove = db.delete(staffServices).where(eq(staffServices.staffId, id));
    if (serviceIds.length === 0) {
      await remove;
      return;
    }
    await db.batch([remove, db.insert(staffServices).values(serviceIds.map((serviceId) => ({ staffId: id, serviceId })))]);
  }
}
