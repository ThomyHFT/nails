import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import {
  clientPackages,
  giftCardRedemptions,
  giftCards,
  packageRedemptions,
  packages,
} from "@/server/infrastructure/db/schema/commerce";
import type {
  ClientPackage,
  NewClientPackage,
  NewServicePackage,
  PackageRepository,
  ServicePackage,
} from "@/server/domain/commerce/package";
import type { GiftCard, GiftCardRepository, NewGiftCard } from "@/server/domain/commerce/gift-card";

function toPackage(row: typeof packages.$inferSelect): ServicePackage {
  return {
    id: row.id,
    professionalId: row.professionalId,
    serviceId: row.serviceId,
    name: row.name,
    sessions: row.sessions,
    priceClp: row.priceClp,
    active: row.active,
    createdAt: row.createdAt,
  };
}

const sessionsUsed = sql<number>`(
  SELECT count(*)::int FROM ${packageRedemptions} WHERE ${packageRedemptions.clientPackageId} = ${clientPackages.id}
)`;

function toClientPackage(row: typeof clientPackages.$inferSelect, used: number): ClientPackage {
  return {
    id: row.id,
    professionalId: row.professionalId,
    clientUserId: row.clientUserId,
    packageId: row.packageId,
    serviceId: row.serviceId,
    name: row.name,
    sessionsTotal: row.sessionsTotal,
    sessionsUsed: Number(used),
    priceClp: row.priceClp,
    soldAt: row.soldAt,
  };
}

export class DrizzlePackageRepository implements PackageRepository {
  async listPackages(professionalId: string): Promise<ServicePackage[]> {
    const rows = await db
      .select()
      .from(packages)
      .where(eq(packages.professionalId, professionalId))
      .orderBy(desc(packages.active), packages.name);
    return rows.map(toPackage);
  }

  async findPackage(id: string, professionalId: string): Promise<ServicePackage | null> {
    const [row] = await db
      .select()
      .from(packages)
      .where(and(eq(packages.id, id), eq(packages.professionalId, professionalId)))
      .limit(1);
    return row ? toPackage(row) : null;
  }

  async createPackage(pkg: NewServicePackage): Promise<ServicePackage> {
    const [row] = await db.insert(packages).values(pkg).returning();
    return toPackage(row);
  }

  async setPackageActive(id: string, professionalId: string, active: boolean): Promise<ServicePackage | null> {
    const [row] = await db
      .update(packages)
      .set({ active })
      .where(and(eq(packages.id, id), eq(packages.professionalId, professionalId)))
      .returning();
    return row ? toPackage(row) : null;
  }

  async listClientPackages(professionalId: string, clientUserId: string): Promise<ClientPackage[]> {
    const rows = await db
      .select({ row: clientPackages, used: sessionsUsed })
      .from(clientPackages)
      .where(and(eq(clientPackages.professionalId, professionalId), eq(clientPackages.clientUserId, clientUserId)))
      .orderBy(desc(clientPackages.soldAt));
    return rows.map(({ row, used }) => toClientPackage(row, used));
  }

  async findClientPackage(id: string, professionalId: string): Promise<ClientPackage | null> {
    const [result] = await db
      .select({ row: clientPackages, used: sessionsUsed })
      .from(clientPackages)
      .where(and(eq(clientPackages.id, id), eq(clientPackages.professionalId, professionalId)))
      .limit(1);
    return result ? toClientPackage(result.row, result.used) : null;
  }

  async sellPackage(pkg: NewClientPackage): Promise<ClientPackage> {
    const [row] = await db.insert(clientPackages).values(pkg).returning();
    return toClientPackage(row, 0);
  }

  // Un solo INSERT ... SELECT con la condición: dos clics seguidos no gastan
  // una sesión que no existe.
  async redeemSession(clientPackageId: string, bookingId: string | null): Promise<boolean> {
    const result = await db.execute(sql`
      INSERT INTO package_redemptions (client_package_id, booking_id)
      SELECT cp.id, ${bookingId}::uuid FROM client_packages cp
      WHERE cp.id = ${clientPackageId}::uuid
        AND (SELECT count(*) FROM package_redemptions r WHERE r.client_package_id = cp.id) < cp.sessions_total
      RETURNING id
    `);
    return result.rows.length > 0;
  }

  async undoLastRedemption(clientPackageId: string): Promise<boolean> {
    const result = await db.execute(sql`
      DELETE FROM package_redemptions WHERE id = (
        SELECT id FROM package_redemptions WHERE client_package_id = ${clientPackageId}::uuid
        ORDER BY created_at DESC LIMIT 1
      )
      RETURNING id
    `);
    return result.rows.length > 0;
  }
}

const spent = sql<number>`(
  SELECT COALESCE(sum(${giftCardRedemptions.amountClp}), 0)::int FROM ${giftCardRedemptions}
  WHERE ${giftCardRedemptions.giftCardId} = ${giftCards.id}
)`;
const redemptionCount = sql<number>`(
  SELECT count(*)::int FROM ${giftCardRedemptions} WHERE ${giftCardRedemptions.giftCardId} = ${giftCards.id}
)`;

function toGiftCard(row: typeof giftCards.$inferSelect, spentClp: number, count: number): GiftCard {
  return {
    id: row.id,
    professionalId: row.professionalId,
    code: row.code,
    amountClp: row.amountClp,
    balanceClp: row.amountClp - Number(spentClp),
    buyerName: row.buyerName,
    recipientName: row.recipientName,
    message: row.message,
    expiresAt: row.expiresAt,
    voidedAt: row.voidedAt,
    hasRedemptions: Number(count) > 0,
    createdAt: row.createdAt,
  };
}

const giftCardColumns = { row: giftCards, spent, count: redemptionCount };

export class DrizzleGiftCardRepository implements GiftCardRepository {
  async create(card: NewGiftCard): Promise<GiftCard> {
    const [row] = await db.insert(giftCards).values(card).returning();
    return toGiftCard(row, 0, 0);
  }

  async listByProfessional(professionalId: string): Promise<GiftCard[]> {
    const rows = await db
      .select(giftCardColumns)
      .from(giftCards)
      .where(eq(giftCards.professionalId, professionalId))
      .orderBy(desc(giftCards.createdAt));
    return rows.map((r) => toGiftCard(r.row, r.spent, r.count));
  }

  async findById(id: string, professionalId: string): Promise<GiftCard | null> {
    const [r] = await db
      .select(giftCardColumns)
      .from(giftCards)
      .where(and(eq(giftCards.id, id), eq(giftCards.professionalId, professionalId)))
      .limit(1);
    return r ? toGiftCard(r.row, r.spent, r.count) : null;
  }

  async findByCode(code: string): Promise<GiftCard | null> {
    const [r] = await db.select(giftCardColumns).from(giftCards).where(eq(giftCards.code, code)).limit(1);
    return r ? toGiftCard(r.row, r.spent, r.count) : null;
  }

  async redeem(id: string, amountClp: number, bookingId: string | null): Promise<boolean> {
    const result = await db.execute(sql`
      INSERT INTO gift_card_redemptions (gift_card_id, amount_clp, booking_id)
      SELECT g.id, ${amountClp}::int, ${bookingId}::uuid FROM gift_cards g
      WHERE g.id = ${id}::uuid AND g.voided_at IS NULL
        AND g.amount_clp - COALESCE((SELECT sum(amount_clp) FROM gift_card_redemptions x WHERE x.gift_card_id = g.id), 0) >= ${amountClp}::int
      RETURNING id
    `);
    return result.rows.length > 0;
  }

  async voidCard(id: string, professionalId: string): Promise<boolean> {
    const result = await db.execute(sql`
      UPDATE gift_cards SET voided_at = now()
      WHERE id = ${id}::uuid AND professional_id = ${professionalId}::uuid AND voided_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM gift_card_redemptions WHERE gift_card_id = ${id}::uuid)
      RETURNING id
    `);
    return result.rows.length > 0;
  }
}
