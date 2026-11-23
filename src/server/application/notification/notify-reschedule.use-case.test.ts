import { describe, expect, it } from "vitest";
import { makeProfessional } from "@/server/application/admin/__fakes__/professional-fixture";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { InMemoryBrandingRepository } from "@/server/application/branding/__fakes__/in-memory-branding-repository";
import { FakeEmailSender } from "@/server/application/notification/__fakes__/fake-email-sender";
import { InMemoryEmailNotificationRepository } from "@/server/application/notification/__fakes__/in-memory-email-notification-repository";
import { NotifyRescheduleUseCase } from "@/server/application/notification/notify-reschedule.use-case";
import { InMemoryProfessionalRepository } from "@/server/application/professional/__fakes__/in-memory-professional-repository";

async function setup() {
  const users = new InMemoryUserRepository();
  const professionals = new InMemoryProfessionalRepository();
  const bookings = new InMemoryBookingRepository();
  const emailSender = new FakeEmailSender();
  const notifications = new InMemoryEmailNotificationRepository();
  const owner = await users.create({ email: "fran@example.com", passwordHash: "h", name: "Fran", role: "professional" });
  const client = await users.create({ email: "clienta@example.com", passwordHash: "h", name: "Clienta", role: "client" });
  professionals.professionals.push(makeProfessional({ id: "prof-1", ownerUserId: owner.id }));
  const booking = await bookings.create({
    professionalId: "prof-1",
    clientUserId: client.id,
    serviceVariantId: "v",
    startsAt: new Date("2026-08-12T14:00:00Z"),
    endsAt: new Date("2026-08-12T15:00:00Z"),
    priceClp: 15_000,
    durationMinutes: 60,
  });
  const useCase = new NotifyRescheduleUseCase(users, professionals, new InMemoryBrandingRepository(), emailSender, notifications);
  return { useCase, booking, emailSender, notifications };
}

describe("NotifyRescheduleUseCase (SPEC 19)", () => {
  it("tells the professional when the client moved the booking", async () => {
    const { useCase, booking, emailSender, notifications } = await setup();

    await useCase.execute({ booking, previousStartsAt: new Date("2026-08-10T14:00:00Z"), movedBy: "client" });

    expect(emailSender.sent.map((e) => e.to)).toEqual(["fran@example.com"]);
    expect(notifications.rows[0]).toMatchObject({ type: "reschedule", status: "sent" });
  });

  it("tells the client when the professional moved the booking", async () => {
    const { useCase, booking, emailSender } = await setup();

    await useCase.execute({ booking, previousStartsAt: new Date("2026-08-10T14:00:00Z"), movedBy: "professional" });

    expect(emailSender.sent.map((e) => e.to)).toEqual(["clienta@example.com"]);
  });
});
