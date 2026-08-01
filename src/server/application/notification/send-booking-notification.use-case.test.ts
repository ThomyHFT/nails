import { describe, expect, it } from "vitest";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { InMemoryBrandingRepository } from "@/server/application/branding/__fakes__/in-memory-branding-repository";
import { FakeEmailSender } from "@/server/application/notification/__fakes__/fake-email-sender";
import { InMemoryEmailNotificationRepository } from "@/server/application/notification/__fakes__/in-memory-email-notification-repository";
import { SendBookingNotificationUseCase } from "@/server/application/notification/send-booking-notification.use-case";
import { InMemoryProfessionalRepository } from "@/server/application/professional/__fakes__/in-memory-professional-repository";

async function setup() {
  const bookingRepository = new InMemoryBookingRepository();
  const userRepository = new InMemoryUserRepository();
  const professionalRepository = new InMemoryProfessionalRepository();
  const brandingRepository = new InMemoryBrandingRepository();
  const emailSender = new FakeEmailSender();
  const emailNotificationRepository = new InMemoryEmailNotificationRepository();

  const client = await userRepository.create({
    email: "clienta@example.com",
    passwordHash: "hash",
    name: "Clienta",
    role: "client",
  });

  professionalRepository.professionals.push({
    id: "prof-1",
    slug: "fran-unas",
    ownerUserId: "owner-1",
    businessName: "Fran Uñas",
    bio: null,
    phone: null,
    instagramHandle: null,
    timezone: "America/Santiago",
    active: true,
    bufferMinutes: 15,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const booking = await bookingRepository.create({
    professionalId: "prof-1",
    clientUserId: client.id,
    serviceVariantId: "variant-1",
    startsAt: new Date("2026-08-10T14:00:00Z"),
    endsAt: new Date("2026-08-10T15:00:00Z"),
    priceClp: 15_000,
    durationMinutes: 60,
  });

  const useCase = new SendBookingNotificationUseCase(
    bookingRepository,
    userRepository,
    professionalRepository,
    brandingRepository,
    emailSender,
    emailNotificationRepository,
  );

  return { useCase, booking, client, emailSender, emailNotificationRepository };
}

describe("SendBookingNotificationUseCase", () => {
  it("sends a confirmation email and logs it as sent", async () => {
    const { useCase, booking, client, emailSender, emailNotificationRepository } = await setup();

    await useCase.execute({ bookingId: booking.id, type: "confirmation" });

    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0]?.to).toBe(client.email);
    expect(emailNotificationRepository.rows).toEqual([
      {
        professionalId: "prof-1",
        bookingId: booking.id,
        type: "confirmation",
        status: "sent",
        errorMessage: null,
      },
    ]);
  });

  it("logs a failed attempt without throwing when the email sender fails", async () => {
    const { useCase, booking, emailSender, emailNotificationRepository } = await setup();
    emailSender.failWith = "Resend está caído";

    await expect(useCase.execute({ bookingId: booking.id, type: "cancellation" })).resolves.toBeUndefined();

    expect(emailNotificationRepository.rows).toEqual([
      {
        professionalId: "prof-1",
        bookingId: booking.id,
        type: "cancellation",
        status: "failed",
        errorMessage: "Resend está caído",
      },
    ]);
  });

  it("does nothing when the booking does not exist", async () => {
    const { useCase, emailSender, emailNotificationRepository } = await setup();

    await useCase.execute({ bookingId: "unknown-booking", type: "confirmation" });

    expect(emailSender.sent).toHaveLength(0);
    expect(emailNotificationRepository.rows).toHaveLength(0);
  });
});
