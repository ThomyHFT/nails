import type {
  ClientPackage,
  NewClientPackage,
  NewServicePackage,
  PackageRepository,
  ServicePackage,
} from "@/server/domain/commerce/package";
import type { GiftCard, GiftCardRepository, NewGiftCard } from "@/server/domain/commerce/gift-card";

export class InMemoryPackageRepository implements PackageRepository {
  readonly packages: ServicePackage[] = [];
  readonly sold: Omit<ClientPackage, "sessionsUsed">[] = [];
  readonly redemptions: { clientPackageId: string; bookingId: string | null; at: number }[] = [];
  private nextId = 1;
  private clock = 0;

  private used(id: string) {
    return this.redemptions.filter((r) => r.clientPackageId === id).length;
  }

  private withUsage(pkg: Omit<ClientPackage, "sessionsUsed">): ClientPackage {
    return { ...pkg, sessionsUsed: this.used(pkg.id) };
  }

  async listPackages(professionalId: string) {
    return this.packages.filter((p) => p.professionalId === professionalId);
  }

  async findPackage(id: string, professionalId: string) {
    return this.packages.find((p) => p.id === id && p.professionalId === professionalId) ?? null;
  }

  async createPackage(pkg: NewServicePackage) {
    const created: ServicePackage = { ...pkg, id: `pkg-${this.nextId++}`, active: true, createdAt: new Date() };
    this.packages.push(created);
    return created;
  }

  async setPackageActive(id: string, professionalId: string, active: boolean) {
    const pkg = await this.findPackage(id, professionalId);
    if (!pkg) return null;
    pkg.active = active;
    return pkg;
  }

  async listClientPackages(professionalId: string, clientUserId: string) {
    return this.sold
      .filter((p) => p.professionalId === professionalId && p.clientUserId === clientUserId)
      .map((p) => this.withUsage(p));
  }

  async findClientPackage(id: string, professionalId: string) {
    const pkg = this.sold.find((p) => p.id === id && p.professionalId === professionalId);
    return pkg ? this.withUsage(pkg) : null;
  }

  async sellPackage(pkg: NewClientPackage) {
    const created = { ...pkg, id: `cp-${this.nextId++}`, soldAt: new Date() };
    this.sold.push(created);
    return this.withUsage(created);
  }

  async redeemSession(clientPackageId: string, bookingId: string | null) {
    const pkg = this.sold.find((p) => p.id === clientPackageId);
    if (!pkg || this.used(clientPackageId) >= pkg.sessionsTotal) return false;
    this.redemptions.push({ clientPackageId, bookingId, at: this.clock++ });
    return true;
  }

  async undoLastRedemption(clientPackageId: string) {
    const mine = this.redemptions.filter((r) => r.clientPackageId === clientPackageId);
    if (mine.length === 0) return false;
    const last = mine.reduce((a, b) => (b.at > a.at ? b : a));
    this.redemptions.splice(this.redemptions.indexOf(last), 1);
    return true;
  }
}

export class InMemoryGiftCardRepository implements GiftCardRepository {
  readonly cards: Omit<GiftCard, "balanceClp" | "hasRedemptions">[] = [];
  readonly redemptions: { giftCardId: string; amountClp: number }[] = [];
  private nextId = 1;

  private view(card: Omit<GiftCard, "balanceClp" | "hasRedemptions">): GiftCard {
    const spent = this.redemptions.filter((r) => r.giftCardId === card.id);
    return {
      ...card,
      balanceClp: card.amountClp - spent.reduce((sum, r) => sum + r.amountClp, 0),
      hasRedemptions: spent.length > 0,
    };
  }

  async create(card: NewGiftCard) {
    if (this.cards.some((c) => c.code === card.code)) throw new Error("duplicate code");
    const created = { ...card, id: `gc-${this.nextId++}`, voidedAt: null, createdAt: new Date() };
    this.cards.push(created);
    return this.view(created);
  }

  async listByProfessional(professionalId: string) {
    return this.cards.filter((c) => c.professionalId === professionalId).map((c) => this.view(c));
  }

  async findById(id: string, professionalId: string) {
    const card = this.cards.find((c) => c.id === id && c.professionalId === professionalId);
    return card ? this.view(card) : null;
  }

  async findByCode(code: string) {
    const card = this.cards.find((c) => c.code === code);
    return card ? this.view(card) : null;
  }

  async redeem(id: string, amountClp: number) {
    const card = this.cards.find((c) => c.id === id);
    if (!card || card.voidedAt || this.view(card).balanceClp < amountClp) return false;
    this.redemptions.push({ giftCardId: id, amountClp });
    return true;
  }

  async voidCard(id: string, professionalId: string) {
    const card = this.cards.find((c) => c.id === id && c.professionalId === professionalId);
    if (!card || card.voidedAt || this.view(card).hasRedemptions) return false;
    card.voidedAt = new Date();
    return true;
  }
}
