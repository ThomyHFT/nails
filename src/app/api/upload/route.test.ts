import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Booking } from "@/server/domain/booking/booking.entity";

const { findByIdMock } = vi.hoisted(() => ({ findByIdMock: vi.fn() }));

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/server/infrastructure/repositories/drizzle-booking.repository", () => ({
  DrizzleBookingRepository: vi.fn().mockImplementation(function DrizzleBookingRepository() {
    return { findById: findByIdMock };
  }),
}));

vi.mock("@/server/infrastructure/repositories/drizzle-professional.repository", () => ({
  DrizzleProfessionalRepository: vi.fn().mockImplementation(function DrizzleProfessionalRepository() {
    return { findByOwnerUserId: vi.fn() };
  }),
}));

const { canUploadAsDesignReferenceClient, canUploadAsReviewClient } = await import(
  "@/app/api/upload/route"
);

function completedBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-1",
    professionalId: "prof-1",
    clientUserId: "client-1",
    serviceVariantId: "variant-1",
    designId: null,
    startsAt: new Date(),
    endsAt: new Date(),
    status: "completed",
    priceClp: 15_000,
    durationMinutes: 60,
    clientNote: null,
    professionalNote: null,
    cancelledAt: null,
    cancelledBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  findByIdMock.mockReset();
});

describe("canUploadAsDesignReferenceClient", () => {
  it("allows a client to upload a design-reference photo without any booking", () => {
    expect(canUploadAsDesignReferenceClient(JSON.stringify({ purpose: "design-reference" }))).toBe(true);
  });

  it("rejects a payload with a different purpose", () => {
    expect(canUploadAsDesignReferenceClient(JSON.stringify({ purpose: "something-else" }))).toBe(false);
  });

  it("rejects a missing or malformed payload", () => {
    expect(canUploadAsDesignReferenceClient(null)).toBe(false);
    expect(canUploadAsDesignReferenceClient("not-json")).toBe(false);
  });
});

describe("canUploadAsReviewClient", () => {
  it("still requires a completed booking owned by the client", async () => {
    findByIdMock.mockResolvedValue(completedBooking({ clientUserId: "client-1" }));

    const allowed = await canUploadAsReviewClient("client-1", JSON.stringify({ bookingId: "booking-1" }));

    expect(allowed).toBe(true);
  });

  it("rejects a booking that is not completed, even with a design-reference-shaped payload", async () => {
    findByIdMock.mockResolvedValue(completedBooking({ clientUserId: "client-1", status: "pending" }));

    const allowed = await canUploadAsReviewClient("client-1", JSON.stringify({ bookingId: "booking-1" }));

    expect(allowed).toBe(false);
  });

  it("rejects a booking owned by another client", async () => {
    findByIdMock.mockResolvedValue(completedBooking({ clientUserId: "other-client" }));

    const allowed = await canUploadAsReviewClient("client-1", JSON.stringify({ bookingId: "booking-1" }));

    expect(allowed).toBe(false);
  });

  it("does not loosen up for a design-reference payload, which carries no bookingId", async () => {
    const allowed = await canUploadAsReviewClient("client-1", JSON.stringify({ purpose: "design-reference" }));

    expect(allowed).toBe(false);
    expect(findByIdMock).not.toHaveBeenCalled();
  });
});
