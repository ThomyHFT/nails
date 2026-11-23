import { describe, expect, it } from "vitest";
import { makeProfessional } from "@/server/application/admin/__fakes__/professional-fixture";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { InMemoryBrandingRepository } from "@/server/application/branding/__fakes__/in-memory-branding-repository";
import { FakeEmailSender } from "@/server/application/notification/__fakes__/fake-email-sender";
import { InMemoryEmailNotificationRepository } from "@/server/application/notification/__fakes__/in-memory-email-notification-repository";
import { SendRemindersUseCase } from "@/server/application/notification/send-reminders.use-case";
import { InMemoryProfessionalRepository } from "@/server/application/professional/__fakes__/in-memory-professional-repository";
import { InMemoryServicesRepository } from "@/server/application/service/__fakes__/in-memory-services-repository";
import { placeholderEmail } from "@/server/domain/user/client-contact";

// 13:00 en Santiago (UTC-4 en agosto): "mañana" es el 10 de agosto local.
const NOW = new Date("2026-08-09T17:00:00Z");

async function setup() {
  const bookings = new InMemoryBookingRepository();
  const users = new InMemoryUserRepository();
  const professionals = new InMemoryProfessionalRepository();
  const emailSender = new FakeEmailSender();
  const notifications = new InMemoryEmailNotificationRepository();
  professionals.professionals.push(
    makeProfessional({ id: "prof-1", slug: "fran", businessName: "Fran Uñas", timezone: "America/Santiago" }),
  );
  const client = await users.create({ email: "clienta@example.com", passwordHash: "h", name: "Clienta", role: "client" });

  async function book(startsAt: string, { confirmed = true, clientUserId = client.id } = {}) {
    const start = new Date(startsAt);
    const booking = await bookings.create({
      professionalId: "prof-1",
      clientUserId,
      serviceVariantId: "variant-1",
      startsAt: start,
      endsAt: new Date(start.getTime() + 60 * 60_000),
      priceClp: 15_000,
      durationMinutes: 60,
    });
    if (confirmed) await bookings.updateStatus(booking.id, "confirmed", ["pending"]);
    return booking;
  }

  const useCase = new SendRemindersUseCase(
    bookings,
    professionals,
    users,
    new InMemoryBrandingRepository(),
    new InMemoryServicesRepository(),
    emailSender,
    notifications,
  );
  return { bookings, users, emailSender, notifications, useCase, book };
}

describe("SendRemindersUseCase (SPEC 19)", () => {
  it("reminds only confirmed bookings whose local day is tomorrow", async () => {
    const { useCase, book, emailSender, notifications } = await setup();
    await book("2026-08-10T14:00:00Z"); // 10:00 del 10: sí
    await book("2026-08-11T03:30:00Z"); // 23:30 del 10 en Santiago: sí
    await book("2026-08-11T05:00:00Z"); // 01:00 del 11 en Santiago: no
    await book("2026-08-09T20:00:00Z"); // hoy: no
    await book("2026-08-10T16:00:00Z", { confirmed: false }); // pendiente: no

    const result = await useCase.execute({ now: NOW, baseUrl: "https://citaya.cl" });

    expect(result).toEqual({ sent: 2, failed: 0, skipped: 0 });
    expect(emailSender.sent).toHaveLength(2);
    expect(emailSender.sent[0].subject).toContain("Fran Uñas");
    expect(emailSender.sent[0].html).toContain("https://citaya.cl/fran/cuenta");
    expect(notifications.rows.every((row) => row.type === "reminder" && row.status === "sent")).toBe(true);
  });

  it("sends a single reminder even if the cron runs twice", async () => {
    const { useCase, book, emailSender } = await setup();
    await book("2026-08-10T14:00:00Z");

    await useCase.execute({ now: NOW, baseUrl: null });
    await useCase.execute({ now: NOW, baseUrl: null });

    expect(emailSender.sent).toHaveLength(1);
  });

  it("skips clients booked by hand, who have no real email", async () => {
    const { useCase, book, users, emailSender } = await setup();
    const manual = await users.create({ email: placeholderEmail("x"), passwordHash: "!", name: "Sin correo", role: "client" });
    await book("2026-08-10T14:00:00Z", { clientUserId: manual.id });

    const result = await useCase.execute({ now: NOW, baseUrl: null });

    expect(result.skipped).toBe(1);
    expect(emailSender.sent).toHaveLength(0);
  });

  it("records a failed send without retrying it", async () => {
    const { useCase, book, emailSender, notifications } = await setup();
    await book("2026-08-10T14:00:00Z");
    emailSender.failWith = "boom";

    expect(await useCase.execute({ now: NOW, baseUrl: null })).toEqual({ sent: 0, failed: 1, skipped: 0 });
    emailSender.failWith = null;
    expect(await useCase.execute({ now: NOW, baseUrl: null })).toEqual({ sent: 0, failed: 0, skipped: 0 });
    expect(notifications.rows[0]).toMatchObject({ type: "reminder", status: "failed", errorMessage: "boom" });
  });

  it("gives a rescheduled booking a new reminder", async () => {
    const { useCase, book, bookings, emailSender } = await setup();
    const booking = await book("2026-08-10T14:00:00Z");
    await useCase.execute({ now: NOW, baseUrl: null });

    await bookings.reschedule(booking.id, new Date("2026-08-10T18:00:00Z"), new Date("2026-08-10T19:00:00Z"), ["confirmed"]);
    await useCase.execute({ now: NOW, baseUrl: null });

    expect(emailSender.sent).toHaveLength(2);
  });
});
