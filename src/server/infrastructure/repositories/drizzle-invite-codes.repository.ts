import { eq } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { inviteCodes } from "@/server/infrastructure/db/schema/invites";
import type { InviteCode } from "@/server/domain/tenant/invite-code.entity";
import type { InviteCodesRepository } from "@/server/domain/tenant/tenant-provisioning-repository.port";

function toDomain(row: typeof inviteCodes.$inferSelect): InviteCode {
  return {
    id: row.id,
    code: row.code,
    note: row.note,
    usedByProfessionalId: row.usedByProfessionalId,
    usedAt: row.usedAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}

export class DrizzleInviteCodesRepository implements InviteCodesRepository {
  async findByCode(code: string): Promise<InviteCode | null> {
    const [row] = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code)).limit(1);
    return row ? toDomain(row) : null;
  }
}
