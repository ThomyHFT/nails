import { describe, expect, it } from "vitest";
import { generateInviteCode, inviteCodeStatus, type InviteCode } from "@/server/domain/tenant/invite-code.entity";

const NOW = new Date("2026-08-03T12:00:00Z");

function makeCode(overrides: Partial<InviteCode> = {}): InviteCode {
  return {
    id: "invite-1",
    code: "ABCD1234",
    note: null,
    usedByProfessionalId: null,
    usedAt: null,
    expiresAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("inviteCodeStatus", () => {
  it("está disponible sin uso ni vencimiento", () => {
    expect(inviteCodeStatus(makeCode(), NOW)).toBe("available");
  });

  it("está usado si tiene usedAt", () => {
    expect(inviteCodeStatus(makeCode({ usedAt: NOW, usedByProfessionalId: "p1" }), NOW)).toBe("used");
  });

  it("está vencido si expiresAt ya pasó y no se usó", () => {
    expect(inviteCodeStatus(makeCode({ expiresAt: new Date("2026-08-01T00:00:00Z") }), NOW)).toBe("expired");
  });

  it("un código usado antes de vencer sigue siendo 'used', no 'expired'", () => {
    expect(
      inviteCodeStatus(
        makeCode({ expiresAt: new Date("2026-08-01T00:00:00Z"), usedAt: new Date("2026-07-01T00:00:00Z"), usedByProfessionalId: "p1" }),
        NOW,
      ),
    ).toBe("used");
  });
});

describe("generateInviteCode", () => {
  it("genera un código de 8 caracteres sin 0/O/1/I", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(8);
    expect(code).not.toMatch(/[0O1I]/);
  });

  it("no genera siempre el mismo código", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateInviteCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});
