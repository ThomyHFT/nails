import { describe, expect, it } from "vitest";
import {
  isAddressVisible,
  isPhoneVisible,
  isPubliclyVisible,
  type Professional,
} from "@/server/domain/professional/professional.entity";

function professional(overrides: Partial<Professional> = {}): Professional {
  return {
    id: "1",
    slug: "karla",
    ownerUserId: "user-1",
    businessName: "Uñas por Karla",
    vertical: "nails",
    bio: null,
    tagline: null,
    phone: null,
    phoneVisible: true,
    address: null,
    addressVisible: true,
    instagramHandle: null,
    timezone: "America/Santiago",
    active: true,
    publishedAt: new Date("2026-01-01T00:00:00Z"),
    trialEndsAt: null,
    bufferMinutes: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("Professional entity shape", () => {
  it("accepts a fully-populated professional", () => {
    const result = professional();
    expect(result.slug).toBe("karla");
    expect(result.active).toBe(true);
  });
});

describe("isPubliclyVisible", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("shows a published, active tenant with no expiry", () => {
    expect(isPubliclyVisible(professional(), now)).toBe(true);
  });

  it("hides a tenant switched off manually", () => {
    expect(isPubliclyVisible(professional({ active: false }), now)).toBe(false);
  });

  it("hides a tenant that never verified its email", () => {
    expect(isPubliclyVisible(professional({ publishedAt: null }), now)).toBe(false);
  });

  it("shows a tenant whose trial is still running", () => {
    const trialEndsAt = new Date("2026-06-15T00:00:00Z");
    expect(isPubliclyVisible(professional({ trialEndsAt }), now)).toBe(true);
  });

  it("hides a tenant whose trial already expired", () => {
    const trialEndsAt = new Date("2026-05-01T00:00:00Z");
    expect(isPubliclyVisible(professional({ trialEndsAt }), now)).toBe(false);
  });

  it("treats the exact expiry instant as expired", () => {
    expect(isPubliclyVisible(professional({ trialEndsAt: now }), now)).toBe(false);
  });

  it("never expires when trialEndsAt is null", () => {
    const farFuture = new Date("2099-01-01T00:00:00Z");
    expect(isPubliclyVisible(professional({ trialEndsAt: null }), farFuture)).toBe(true);
  });

  it("requires every condition, not just one", () => {
    const expired = new Date("2026-05-01T00:00:00Z");
    expect(isPubliclyVisible(professional({ active: false, publishedAt: null, trialEndsAt: expired }), now)).toBe(
      false,
    );
  });
});

describe("isPhoneVisible", () => {
  it("shows the phone when it exists and is not hidden", () => {
    expect(isPhoneVisible(professional({ phone: "+56911111111", phoneVisible: true }))).toBe(true);
  });

  it("hides it when there is no phone even if the toggle is on", () => {
    expect(isPhoneVisible(professional({ phone: null, phoneVisible: true }))).toBe(false);
  });

  it("hides it when the professional turned it off", () => {
    expect(isPhoneVisible(professional({ phone: "+56911111111", phoneVisible: false }))).toBe(false);
  });
});

describe("isAddressVisible", () => {
  it("shows the address when it exists and is not hidden", () => {
    expect(isAddressVisible(professional({ address: "Av. Siempre Viva 742", addressVisible: true }))).toBe(true);
  });

  it("hides it when there is no address even if the toggle is on", () => {
    expect(isAddressVisible(professional({ address: null, addressVisible: true }))).toBe(false);
  });

  it("hides it when the professional turned it off", () => {
    expect(isAddressVisible(professional({ address: "Av. Siempre Viva 742", addressVisible: false }))).toBe(false);
  });
});
