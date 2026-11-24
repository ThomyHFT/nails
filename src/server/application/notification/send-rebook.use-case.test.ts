import { describe, expect, it } from "vitest";
import { makeProfessional } from "@/server/application/admin/__fakes__/professional-fixture";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { InMemoryBrandingRepository } from "@/server/application/branding/__fakes__/in-memory-branding-repository";
import { FakeEmailSender } from "@/server/application/notification/__fakes__/fake-email-sender";
import { InMemoryEmailNotificationRepository } from "@/server/application/notification/__fakes__/in-memory-email-notification-repository";
import { SendRebookUseCase } from "@/server/application/notification/send-rebook.use-case";
import { InMemoryProfessionalRepository } from "@/server/application/professional/__fakes__/in-memory-professional-repository";
import { InMemoryServicesRepository } from "@/server/application/service/__fakes__/in-memory-services-repository";
import { DEFAULT_PROFESSIONAL_COMMERCE } from "@/server/domain/professional/commerce";

// 13:00 del 31 de agosto en Santiago.
const NOW = new Date("2026-08-31T17:00:00Z");

async function setup(rebookAfterDays: number | null = 21) {
  const bookings = new InMemoryBookingRepository();
  const users = new InMemoryUserRepository();
  const professionals = new InMemoryProfessionalRepository();
  const emailSender = new FakeEmailSender();
  professionals.professionals.push(
    makeProfessional({
      id: "prof-1",
      slug: "fran",
      businessName: "Fran",
      timezone: "America/Santiago",
      commerce: { ...DEFAULT_PROFESSIONAL_COMMERCE, rebookAfterDays },
    }),
  );
  const client = await users.create({ email: "c@x.cl", passwordHash: "h", name: "Camila Rojas", role: "client" });

  async function book(startsAt: string, status: "completed" | "confirmed" = "completed") {
    const start = new Date(startsAt);
    const booking = await bookings.create({
      professionalId: "prof-1",
      clientUserId: client.id,
      serviceVariantId: "variant-1",
      startsAt: start,
      endsAt: new Date(start.getTime() + 3_600_000),
      priceClp: 1,
      durationMinutes: 60,
    });
    await bookings.updateStatus(booking.id, status);
    return booking;
  }

  const useCase = new SendRebookUseCase(
    bookings,
    professionals,
    users,
    new InMemoryBrandingRepository(),
    new InMemoryServicesRepository(),
    emailSender,
    new InMemoryEmailNotificationRepository(),
  );
  return { useCase, book, emailSender };
}

describe("SendRebookUseCase (SPEC 21)", () => {
  it("invites once when the configured days have passed", async () => {
    const { useCase, book, emailSender } = await setup(21);
    await book("2026-08-10T14:00:00Z"); // 21 días antes, local
    const first = await useCase.execute({ now: NOW, baseUrl: "https://citaya.cl" });
    expect(first.sent).toBe(1);
    expect(emailSender.sent[0].html).toContain("Camila");
    expect(emailSender.sent[0].html).toContain("https://citaya.cl/fran/reservar");

    const second = await useCase.execute({ now: NOW, baseUrl: "https://citaya.cl" });
    expect(second.sent).toBe(0);
    expect(emailSender.sent).toHaveLength(1);
  });

  it("waits until the day and stops after the grace window", async () => {
    const { useCase, book } = await setup(21);
    await book("2026-08-20T14:00:00Z"); // 11 días: todavía no
    await book("2026-07-20T14:00:00Z"); // 42 días: ya pasó el margen
    expect((await useCase.execute({ now: NOW, baseUrl: "x" })).sent).toBe(0);
  });

  it("never invites a client with an upcoming booking or who already came back", async () => {
    const upcoming = await setup(21);
    await upcoming.book("2026-08-10T14:00:00Z");
    await upcoming.book("2026-09-05T14:00:00Z", "confirmed");
    expect((await upcoming.useCase.execute({ now: NOW, baseUrl: "x" })).sent).toBe(0);

    const cameBack = await setup(14);
    await cameBack.book("2026-08-17T14:00:00Z"); // 14 días
    await cameBack.book("2026-08-24T14:00:00Z"); // volvió después
    expect((await cameBack.useCase.execute({ now: NOW, baseUrl: "x" })).sent).toBe(0);
  });

  it("does nothing when the professional has it off", async () => {
    const { useCase, book } = await setup(null);
    await book("2026-08-10T14:00:00Z");
    expect((await useCase.execute({ now: NOW, baseUrl: "x" })).sent).toBe(0);
  });
});
