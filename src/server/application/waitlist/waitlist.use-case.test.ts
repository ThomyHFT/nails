import { describe, expect, it } from "vitest";
import { makeProfessional } from "@/server/application/admin/__fakes__/professional-fixture";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { InMemoryBrandingRepository } from "@/server/application/branding/__fakes__/in-memory-branding-repository";
import { FakeEmailSender } from "@/server/application/notification/__fakes__/fake-email-sender";
import { InMemoryEmailNotificationRepository } from "@/server/application/notification/__fakes__/in-memory-email-notification-repository";
import { InMemoryProfessionalRepository } from "@/server/application/professional/__fakes__/in-memory-professional-repository";
import { InMemoryServicesRepository } from "@/server/application/service/__fakes__/in-memory-services-repository";
import { InMemoryWaitlistRepository } from "@/server/application/waitlist/__fakes__/in-memory-waitlist-repository";
import {
  JoinWaitlistUseCase,
  LeaveWaitlistUseCase,
  NotifyWaitlistUseCase,
  WaitlistEntryNotFoundError,
  WaitlistLimitError,
  WaitlistPastDateError,
} from "@/server/application/waitlist/waitlist.use-case";
import { placeholderEmail } from "@/server/domain/user/client-contact";

const NOW = new Date("2026-08-09T17:00:00Z"); // 13:00 del 9 en Santiago

function join(waitlist: InMemoryWaitlistRepository, date: string, clientUserId = "c-1") {
  return new JoinWaitlistUseCase(waitlist).execute({
    professionalId: "prof-1",
    timezone: "America/Santiago",
    clientUserId,
    serviceVariantId: "variant-1",
    date,
    now: NOW,
  });
}

describe("JoinWaitlistUseCase", () => {
  it("is idempotent per day and rejects past days", async () => {
    const waitlist = new InMemoryWaitlistRepository();
    const first = await join(waitlist, "2026-08-12");
    const again = await join(waitlist, "2026-08-12");
    expect(again.id).toBe(first.id);
    await expect(join(waitlist, "2026-08-08")).rejects.toThrow(WaitlistPastDateError);
    await expect(join(waitlist, "12-08-2026")).rejects.toThrow(WaitlistPastDateError);
  });

  it("caps future entries per client", async () => {
    const waitlist = new InMemoryWaitlistRepository();
    for (const day of ["10", "11", "12", "13", "14"]) await join(waitlist, `2026-08-${day}`);
    await expect(join(waitlist, "2026-08-15")).rejects.toThrow(WaitlistLimitError);
    // Otra clienta no se ve afectada.
    await expect(join(waitlist, "2026-08-15", "c-2")).resolves.toBeDefined();
  });

  it("only lets the owner leave", async () => {
    const waitlist = new InMemoryWaitlistRepository();
    const entry = await join(waitlist, "2026-08-12");
    await expect(new LeaveWaitlistUseCase(waitlist).execute(entry.id, "c-2")).rejects.toThrow(WaitlistEntryNotFoundError);
    await new LeaveWaitlistUseCase(waitlist).execute(entry.id, "c-1");
    expect(waitlist.entries).toHaveLength(0);
  });
});

describe("NotifyWaitlistUseCase", () => {
  async function setup() {
    const waitlist = new InMemoryWaitlistRepository();
    const users = new InMemoryUserRepository();
    const professionals = new InMemoryProfessionalRepository();
    const bookings = new InMemoryBookingRepository();
    const emailSender = new FakeEmailSender();
    professionals.professionals.push(
      makeProfessional({ id: "prof-1", slug: "fran", businessName: "Fran", timezone: "America/Santiago" }),
    );
    const canceller = await users.create({ email: "a@x.cl", passwordHash: "h", name: "A", role: "client" });
    const waiting = await users.create({ email: "b@x.cl", passwordHash: "h", name: "B", role: "client" });
    const manual = await users.create({ email: placeholderEmail("m-1"), passwordHash: "h", name: "C", role: "client" });
    // 20:00 del 12 de agosto en Santiago = 00:00 UTC del 13: el día que cuenta es el local.
    const start = new Date("2026-08-13T00:00:00Z");
    const freed = await bookings.create({
      professionalId: "prof-1",
      clientUserId: canceller.id,
      serviceVariantId: "variant-1",
      startsAt: start,
      endsAt: new Date(start.getTime() + 3_600_000),
      priceClp: 1,
      durationMinutes: 60,
    });
    const useCase = new NotifyWaitlistUseCase(
      waitlist,
      professionals,
      users,
      new InMemoryBrandingRepository(),
      new InMemoryServicesRepository(),
      emailSender,
      new InMemoryEmailNotificationRepository(),
    );
    return { waitlist, useCase, freed, emailSender, canceller, waiting, manual };
  }

  it("emails everyone waiting that local day once, except the canceller and placeholder emails", async () => {
    const { waitlist, useCase, freed, emailSender, canceller, waiting, manual } = await setup();
    await join(waitlist, "2026-08-12", canceller.id);
    await join(waitlist, "2026-08-12", waiting.id);
    await join(waitlist, "2026-08-12", manual.id);
    await join(waitlist, "2026-08-13", "other");

    const result = await useCase.execute({ freedBooking: freed, baseUrl: "https://citaya.cl", now: NOW });
    expect(result).toEqual({ sent: 1, skipped: 2, failed: 0 });
    expect(emailSender.sent[0].to).toBe("b@x.cl");
    expect(emailSender.sent[0].html).toContain("https://citaya.cl/fran/reservar?");
    expect(emailSender.sent[0].html).toContain("fecha=2026-08-12");

    const again = await useCase.execute({ freedBooking: freed, baseUrl: "https://citaya.cl", now: NOW });
    expect(again.sent).toBe(0);
  });

  it("does nothing for a booking that already started", async () => {
    const { waitlist, useCase, freed, waiting } = await setup();
    await join(waitlist, "2026-08-12", waiting.id);
    const result = await useCase.execute({ freedBooking: freed, baseUrl: "x", now: new Date("2026-08-13T01:00:00Z") });
    expect(result.sent).toBe(0);
  });
});
