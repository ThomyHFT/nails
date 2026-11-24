import { describe, expect, it } from "vitest";
import type { Booking } from "@/server/domain/booking/booking.entity";
import type { TenantBranding } from "@/server/domain/branding/tenant-branding.entity";
import {
  buildCancellationEmail,
  buildConfirmationEmail,
  buildNewBookingRequestEmail,
  buildPendingEmail,
} from "@/server/domain/notification/email-templates";

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
    googleEventId: null,
    depositClp: null,
    depositPaidAt: null,
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
  it("shows the deposit and escaped bank details when the booking has one", () => {
    const email = buildPendingEmail({
      booking: booking({ status: "pending", depositClp: 5000 }),
      branding: branding({ primaryColorHex: "#111111" }),
      professionalName: "Fran Uñas",
      bankDetails: {
        bank: "BancoEstado",
        accountType: "Cuenta RUT",
        accountNumber: "123",
        holderName: "<b>Fran</b>",
        holderRut: "1-9",
        email: "f@x.cl",
      },
    });
    expect(email.html).toContain("$5.000");
    expect(email.html).toContain("Cuenta RUT 123");
    expect(email.html).not.toContain("<b>Fran</b>");
  });

  it("omits the deposit block without a deposit", () => {
    const email = buildPendingEmail({ booking: booking(), branding: branding({}), professionalName: "Fran" });
    expect(email.html).not.toContain("abono");
  });

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

describe("buildNewBookingRequestEmail", () => {
  it("includes the client's name, the date and a link to the panel", () => {
    const email = buildNewBookingRequestEmail({
      booking: booking(),
      branding: branding({ primaryColorHex: "#111111" }),
      professionalName: "Fran Uñas",
      clientName: "Camila Rojas",
      panelUrl: "https://agendaunas.cl/fran-unas/admin/reservas",
    });

    expect(email.html).toContain("Camila Rojas");
    expect(email.html).toContain("https://agendaunas.cl/fran-unas/admin/reservas");
    expect(email.subject).toContain("Camila Rojas");
  });

  it("escapes HTML in the client's name so it cannot inject links into the email", () => {
    const email = buildNewBookingRequestEmail({
      booking: booking(),
      branding: branding(),
      professionalName: "Fran Uñas",
      clientName: '<a href="https://evil.example/login">Verifica tu cuenta</a>',
      panelUrl: "https://agendaunas.cl/fran-unas/admin/reservas",
    });

    expect(email.html).not.toContain('<a href="https://evil.example');
    expect(email.html).toContain("&lt;a href=&quot;https://evil.example/login&quot;&gt;");
  });

  it("drops a non-http logo url and a malformed brand color", () => {
    const email = buildNewBookingRequestEmail({
      booking: booking(),
      branding: branding({ logoUrl: "javascript:alert(1)", primaryColorHex: 'red;" onmouseover="x' }),
      professionalName: "Fran Uñas",
      clientName: "Camila Rojas",
      panelUrl: "https://agendaunas.cl/fran-unas/admin/reservas",
    });

    expect(email.html).not.toContain("javascript:");
    expect(email.html).not.toContain("onmouseover");
    expect(email.html).toContain("#111111");
  });
});
