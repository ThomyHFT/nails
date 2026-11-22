import { describe, expect, it, vi } from "vitest";
import { InMemoryBookingRepository } from "@/server/application/booking/__fakes__/in-memory-booking-repository";
import { InMemoryServicesRepository } from "@/server/application/service/__fakes__/in-memory-services-repository";
import { InMemoryUserRepository } from "@/server/application/auth/__fakes__/in-memory-user-repository";
import {
  CreateManualBookingUseCase,
  ManualBookingClientNotFoundError,
  ManualBookingSlotTakenError,
} from "@/server/application/booking/create-manual-booking.use-case";
import { BookingSlotTakenError } from "@/server/domain/booking/booking-repository.port";
import { isPlaceholderEmail, UNUSABLE_PASSWORD_HASH } from "@/server/domain/user/client-contact";

const PROFESSIONAL_ID = "prof-1";
const STARTS_AT = new Date("2026-12-10T13:00:00Z");

async function make() {
  const bookings = new InMemoryBookingRepository();
  const services = new InMemoryServicesRepository();
  const users = new InMemoryUserRepository();
  const service = await services.createService({ professionalId: PROFESSIONAL_ID, name: "Manicure" });
  const variant = await services.createVariant({ serviceId: service.id, label: "Corta", priceClp: 12_000, durationMinutes: 45 });
  return { bookings, users, variant, useCase: new CreateManualBookingUseCase(bookings, services, users) };
}

describe("CreateManualBookingUseCase (SPEC 18)", () => {
  it("books a new client without email as confirmed, with a placeholder email and no usable password", async () => {
    const { useCase, users, variant } = await make();

    const booking = await useCase.execute({
      professionalId: PROFESSIONAL_ID,
      serviceVariantId: variant.id,
      startsAt: STARTS_AT,
      client: { kind: "new", name: "Fernanda", phone: "+56 9 5555 1234" },
      clientNote: "Viene por WhatsApp",
    });

    expect(booking.status).toBe("confirmed");
    expect(booking.priceClp).toBe(12_000);
    expect(booking.endsAt.getTime() - booking.startsAt.getTime()).toBe(45 * 60_000);
    const client = await users.findById(booking.clientUserId);
    expect(client && isPlaceholderEmail(client.email)).toBe(true);
    expect(client?.passwordHash).toBe(UNUSABLE_PASSWORD_HASH);
    expect(client?.phone).toBe("+56 9 5555 1234");
  });

  it("reuses the client with the same phone instead of creating a duplicate", async () => {
    const { useCase, variant } = await make();
    const first = await useCase.execute({
      professionalId: PROFESSIONAL_ID,
      serviceVariantId: variant.id,
      startsAt: STARTS_AT,
      client: { kind: "new", name: "Fernanda", phone: "+56 9 5555 1234" },
    });

    const second = await useCase.execute({
      professionalId: PROFESSIONAL_ID,
      serviceVariantId: variant.id,
      startsAt: new Date("2026-12-17T13:00:00Z"),
      client: { kind: "new", name: "Feña", phone: "56955551234" },
    });

    expect(second.clientUserId).toBe(first.clientUserId);
  });

  it("only books existing clients who already booked with this professional", async () => {
    const { useCase, users, variant } = await make();
    const stranger = await users.create({ email: "x@example.com", passwordHash: "h", name: "X", phone: null, role: "client" });

    await expect(
      useCase.execute({
        professionalId: PROFESSIONAL_ID,
        serviceVariantId: variant.id,
        startsAt: STARTS_AT,
        client: { kind: "existing", userId: stranger.id },
      }),
    ).rejects.toBeInstanceOf(ManualBookingClientNotFoundError);
  });

  it("reports an occupied slot when the database rejects the overlap", async () => {
    const { useCase, bookings, variant } = await make();
    vi.spyOn(bookings, "create").mockRejectedValueOnce(new BookingSlotTakenError());

    await expect(
      useCase.execute({
        professionalId: PROFESSIONAL_ID,
        serviceVariantId: variant.id,
        startsAt: STARTS_AT,
        client: { kind: "new", name: "Fernanda", phone: "+56 9 5555 1234" },
      }),
    ).rejects.toBeInstanceOf(ManualBookingSlotTakenError);
  });
});
