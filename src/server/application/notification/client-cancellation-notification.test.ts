import { DEFAULT_PROFESSIONAL_COMMERCE } from "@/server/domain/professional/commerce";
import { DEFAULT_BOOKING_POLICY } from "@/server/domain/professional/booking-policy";
import { describe, expect, it } from "vitest";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { InMemoryBrandingRepository } from "@/server/application/branding/__fakes__/in-memory-branding-repository";
import { FakeEmailSender } from "@/server/application/notification/__fakes__/fake-email-sender";
import { InMemoryEmailNotificationRepository } from "@/server/application/notification/__fakes__/in-memory-email-notification-repository";
import { SendBookingNotificationUseCase } from "@/server/application/notification/send-booking-notification.use-case";
import { InMemoryProfessionalRepository } from "@/server/application/professional/__fakes__/in-memory-professional-repository";
import { placeholderEmail } from "@/server/domain/user/client-contact";

async function setup(clientEmail: string, professionalPhone: string | null = null) {
  const bookings = new InMemoryBookingRepository();
  const users = new InMemoryUserRepository();
  const professionals = new InMemoryProfessionalRepository();
  const emailSender = new FakeEmailSender();

  const client = await users.create({
    email: clientEmail,
    passwordHash: "hash",
    name: "Camila",
    phone: "+56 9 1234 5678",
    role: "client",
  });
  const owner = await users.create({ email: "fran@example.com", passwordHash: "hash", name: "Fran", role: "professional" });

  professionals.professionals.push({
    id: "prof-1",
    slug: "fran-unas",
    ownerUserId: owner.id,
    businessName: "Fran Uñas",
    vertical: "nails",
    bio: null,
    tagline: null,
    phone: professionalPhone,
    phoneVisible: true,
    address: null,
    addressVisible: true,
    instagramHandle: null,
    timezone: "America/Santiago",
    active: true,
    publishedAt: new Date("2026-01-01T00:00:00Z"),
    trialEndsAt: null,
    bufferMinutes: 0,
    bookingPolicy: DEFAULT_BOOKING_POLICY,
    commerce: DEFAULT_PROFESSIONAL_COMMERCE,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const booking = await bookings.create({
    professionalId: "prof-1",
    clientUserId: client.id,
    serviceVariantId: "variant-1",
    startsAt: new Date("2026-08-10T14:00:00Z"),
    endsAt: new Date("2026-08-10T15:00:00Z"),
    priceClp: 15_000,
    durationMinutes: 60,
  });

  const useCase = new SendBookingNotificationUseCase(
    bookings,
    users,
    professionals,
    new InMemoryBrandingRepository(),
    emailSender,
    new InMemoryEmailNotificationRepository(),
  );
  return { useCase, bookings, booking, emailSender };
}

describe("booking notifications (SPEC 18)", () => {
  it("tells the professional when the client cancels, with the client's WhatsApp", async () => {
    const { useCase, bookings, booking, emailSender } = await setup("camila@example.com");
    await bookings.cancel(booking.id, "client");

    await useCase.execute({ bookingId: booking.id, type: "cancellation", baseUrl: "https://citaya.cl" });

    const toProfessional = emailSender.sent.find((email) => email.to === "fran@example.com");
    expect(toProfessional?.subject).toContain("Camila canceló");
    expect(toProfessional?.html).toContain("https://wa.me/56912345678");
    expect(toProfessional?.html).toContain("https://citaya.cl/fran-unas/admin/reservas");
  });

  it("does not email the professional when she cancelled it herself", async () => {
    const { useCase, bookings, booking, emailSender } = await setup("camila@example.com");
    await bookings.cancel(booking.id, "professional");

    await useCase.execute({ bookingId: booking.id, type: "cancellation" });

    expect(emailSender.sent.map((email) => email.to)).toEqual(["camila@example.com"]);
  });

  it("never emails a placeholder address", async () => {
    const { useCase, booking, emailSender } = await setup(placeholderEmail("abc"));

    await useCase.execute({ bookingId: booking.id, type: "confirmation" });

    expect(emailSender.sent).toHaveLength(0);
  });

  it("offers the professional's WhatsApp in the client's email when her phone is visible", async () => {
    const { useCase, booking, emailSender } = await setup("camila@example.com", "+56 9 8765 4321");

    await useCase.execute({ bookingId: booking.id, type: "confirmation" });

    expect(emailSender.sent[0]?.html).toContain("https://wa.me/56987654321");
  });
});
