import { describe, expect, it } from "vitest";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import {
  InMemoryGiftCardRepository,
  InMemoryPackageRepository,
} from "@/server/application/commerce/__fakes__/in-memory-commerce-repositories";
import {
  CommerceConflictError,
  CommerceNotFoundError,
  CommerceValidationError,
  GiftCardsUseCase,
  PackagesUseCase,
} from "@/server/application/commerce/commerce.use-case";
import { InMemoryServicesRepository } from "@/server/application/service/__fakes__/in-memory-services-repository";
import { giftCardState, normalizeGiftCode } from "@/server/domain/commerce/gift-card";
import { remainingSessions } from "@/server/domain/commerce/package";

async function setupPackages() {
  const packages = new InMemoryPackageRepository();
  const services = new InMemoryServicesRepository();
  const bookings = new InMemoryBookingRepository();
  const service = await services.createService({ professionalId: "prof-1", name: "Manicure" });
  const booking = await bookings.create({
    professionalId: "prof-1",
    clientUserId: "c-1",
    serviceVariantId: "v-1",
    startsAt: new Date("2026-08-10T14:00:00Z"),
    endsAt: new Date("2026-08-10T15:00:00Z"),
    priceClp: 1,
    durationMinutes: 60,
  });
  return { useCase: new PackagesUseCase(packages, services, bookings), packages, service, booking };
}

describe("PackagesUseCase", () => {
  it("validates the catalog entry and the service ownership", async () => {
    const { useCase, service } = await setupPackages();
    await expect(useCase.create("prof-1", { serviceId: service.id, name: "x", sessions: 4, priceClp: 1 })).rejects.toThrow(
      CommerceValidationError,
    );
    await expect(useCase.create("prof-1", { serviceId: service.id, name: "Pack", sessions: 1, priceClp: 1 })).rejects.toThrow(
      CommerceValidationError,
    );
    await expect(useCase.create("prof-2", { serviceId: service.id, name: "Pack", sessions: 4, priceClp: 1 })).rejects.toThrow(
      CommerceNotFoundError,
    );
  });

  it("sells only to the professional's clients and never goes below zero sessions", async () => {
    const { useCase, packages, service, booking } = await setupPackages();
    const pkg = await useCase.create("prof-1", { serviceId: service.id, name: " 2 manicures ", sessions: 2, priceClp: 30_000 });
    await expect(useCase.sell("prof-1", "stranger", pkg.id)).rejects.toThrow(CommerceNotFoundError);

    const sold = await useCase.sell("prof-1", "c-1", pkg.id);
    expect(sold.name).toBe("2 manicures");
    await useCase.redeem("prof-1", sold.id, booking.id);
    await useCase.redeem("prof-1", sold.id, null);
    await expect(useCase.redeem("prof-1", sold.id, null)).rejects.toThrow(CommerceConflictError);
    expect(remainingSessions((await packages.findClientPackage(sold.id, "prof-1"))!)).toBe(0);

    await useCase.undo("prof-1", sold.id);
    expect(remainingSessions((await packages.findClientPackage(sold.id, "prof-1"))!)).toBe(1);
  });

  it("keeps the sold snapshot when the catalog entry is deactivated, and refuses selling it", async () => {
    const { useCase, packages, service } = await setupPackages();
    const pkg = await useCase.create("prof-1", { serviceId: service.id, name: "Pack", sessions: 3, priceClp: 1 });
    const sold = await useCase.sell("prof-1", "c-1", pkg.id);
    await useCase.setActive("prof-1", pkg.id, false);
    await expect(useCase.sell("prof-1", "c-1", pkg.id)).rejects.toThrow(CommerceNotFoundError);
    expect((await packages.findClientPackage(sold.id, "prof-1"))!.sessionsTotal).toBe(3);
  });

  it("refuses a booking from another client or tenant", async () => {
    const { useCase, service } = await setupPackages();
    const pkg = await useCase.create("prof-1", { serviceId: service.id, name: "Pack", sessions: 3, priceClp: 1 });
    const sold = await useCase.sell("prof-1", "c-1", pkg.id);
    await expect(useCase.redeem("prof-2", sold.id, null)).rejects.toThrow(CommerceNotFoundError);
    await expect(useCase.redeem("prof-1", sold.id, "missing")).rejects.toThrow(CommerceNotFoundError);
  });
});

describe("GiftCardsUseCase", () => {
  const NOW = new Date("2026-08-01T00:00:00Z");
  let seq = 0;
  const randomInt = (max: number) => seq++ % max;

  it("issues a canonical, unambiguous code", async () => {
    const repo = new InMemoryGiftCardRepository();
    const card = await new GiftCardsUseCase(repo, randomInt).issue(
      "prof-1",
      { amountClp: 30_000, buyerName: "Ana", recipientName: "Bea" },
      NOW,
    );
    expect(card.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{6}$/);
    expect(card.code).not.toMatch(/[01OIL]/);
    expect(normalizeGiftCode(card.code.toLowerCase().replace("-", " "))).toBe(card.code);
    expect(normalizeGiftCode("ABCD-EF0GHI")).toBeNull();
  });

  it("redeems partial amounts and never below zero", async () => {
    const repo = new InMemoryGiftCardRepository();
    const useCase = new GiftCardsUseCase(repo, randomInt);
    const card = await useCase.issue("prof-1", { amountClp: 30_000, buyerName: "Ana", recipientName: "Bea" }, NOW);
    expect((await useCase.redeem("prof-1", card.id, 20_000, NOW)).balanceClp).toBe(10_000);
    await expect(useCase.redeem("prof-1", card.id, 15_000, NOW)).rejects.toThrow(CommerceConflictError);
    const empty = await useCase.redeem("prof-1", card.id, 10_000, NOW);
    expect(giftCardState(empty, NOW)).toBe("used");
    await expect(useCase.redeem("prof-1", card.id, 1, NOW)).rejects.toThrow(CommerceConflictError);
    await expect(useCase.redeem("prof-2", card.id, 1, NOW)).rejects.toThrow(CommerceNotFoundError);
  });

  it("rejects expired cards and only voids unused ones", async () => {
    const repo = new InMemoryGiftCardRepository();
    const useCase = new GiftCardsUseCase(repo, randomInt);
    const expiring = await useCase.issue(
      "prof-1",
      { amountClp: 5000, buyerName: "Ana", recipientName: "Bea", expiresAt: new Date("2026-09-01T00:00:00Z") },
      NOW,
    );
    await expect(useCase.redeem("prof-1", expiring.id, 1000, new Date("2026-10-01T00:00:00Z"))).rejects.toThrow(
      "vencida",
    );

    const used = await useCase.issue("prof-1", { amountClp: 5000, buyerName: "Ana", recipientName: "Bea" }, NOW);
    await useCase.redeem("prof-1", used.id, 1000, NOW);
    await expect(useCase.void("prof-1", used.id)).rejects.toThrow(CommerceConflictError);
    await useCase.void("prof-1", expiring.id);
    expect(giftCardState((await repo.findById(expiring.id, "prof-1"))!, NOW)).toBe("voided");
  });

  it("validates amount, names and expiry", async () => {
    const useCase = new GiftCardsUseCase(new InMemoryGiftCardRepository(), randomInt);
    await expect(useCase.issue("prof-1", { amountClp: 500, buyerName: "A", recipientName: "B" }, NOW)).rejects.toThrow(
      CommerceValidationError,
    );
    await expect(useCase.issue("prof-1", { amountClp: 5000, buyerName: " ", recipientName: "B" }, NOW)).rejects.toThrow(
      CommerceValidationError,
    );
    await expect(
      useCase.issue("prof-1", { amountClp: 5000, buyerName: "A", recipientName: "B", expiresAt: NOW }, NOW),
    ).rejects.toThrow(CommerceValidationError);
  });
});
