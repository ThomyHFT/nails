import { describe, expect, it } from "vitest";
import type { Booking } from "@/server/domain/booking/booking.entity";
import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";
import { buildCancellationEmail, buildConfirmationEmail, buildPendingEmail } from "@/server/domain/notification/email-templates";

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-1",
    professionalId: "prof-1",
    clientUserId: "client-1",
    serviceVariantId: "variant-1",
    designId: null,
    startsAt: new Date("2026-08-10T14:00:00Z"),
    endsAt: new Date("2026-08-10T15:00:00Z"),
    status: "confirmed",
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

function branding(overrides: Partial<TenantBranding> = {}): TenantBranding {
  return {
    id: "branding-1",
    professionalId: "prof-1",
    archetype: "minimal_nude",
    primaryColorHex: null,
    onPrimaryColorHex: null,
    fontPair: null,
    logoUrl: null,
    coverImageUrl: null,
    heroLayout: "split",
    sectionOrder: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("buildConfirmationEmail", () => {
  it("includes the professional's name, logo and primary color for a minimal_nude tenant", () => {
    const email = buildConfirmationEmail({
      booking: booking(),
      branding: branding({ archetype: "minimal_nude", primaryColorHex: "#B08968", logoUrl: "https://cdn/logo.png" }),
      professionalName: "Fran Uñas",
    });

    expect(email.html).toContain("Fran Uñas");
    expect(email.html).toContain("https://cdn/logo.png");
    expect(email.html).toContain("#B08968");
    expect(email.subject).toContain("Fran Uñas");
  });

  it("includes the professional's name and primary color for a glam tenant without breaking on a missing logo", () => {
    const email = buildConfirmationEmail({
      booking: booking(),
      branding: branding({ archetype: "glam", primaryColorHex: "#7A1F3D", logoUrl: null }),
      professionalName: "Glam Nails",
    });

    expect(email.html).toContain("Glam Nails");
    expect(email.html).toContain("#7A1F3D");
    expect(email.html).not.toContain("<img");
  });
});

describe("buildPendingEmail", () => {
  it("includes the professional's name, the date and says it's pending confirmation", () => {
    const email = buildPendingEmail({
      booking: booking(),
      branding: branding({ primaryColorHex: "#111111" }),
      professionalName: "Fran Uñas",
    });

    expect(email.html).toContain("Fran Uñas");
    expect(email.html).toContain("pendiente de");
    expect(email.subject).toContain("solicitud");
  });
});

describe("buildCancellationEmail", () => {
  it("includes the professional's name and the booking date", () => {
    const email = buildCancellationEmail({
      booking: booking(),
      branding: branding({ primaryColorHex: "#111111" }),
      professionalName: "Fran Uñas",
    });

    expect(email.html).toContain("Fran Uñas");
    expect(email.subject).toContain("cancelada");
  });
});
