import { isHTTPAccessFallbackError } from "next/dist/client/components/http-access-fallback/http-access-fallback";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/server/domain/user/user.entity";

const { authMock, findBySlugMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findBySlugMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));

vi.mock("@/server/infrastructure/repositories/drizzle-professional.repository", () => ({
  DrizzleProfessionalRepository: vi.fn().mockImplementation(function DrizzleProfessionalRepository() {
    return { findBySlug: findBySlugMock };
  }),
}));

const { requireProfessional, requireTenantOwner, requireAdmin } = await import("@/server/interface/guards");

function makeSession(id: string, role: UserRole) {
  return {
    user: { id, role, email: `${id}@example.com`, name: id },
    expires: "2099-01-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  authMock.mockReset();
  findBySlugMock.mockReset();
});

describe("requireProfessional", () => {
  it("redirects to /[slug]/login when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const error = await requireProfessional("karla").catch((err) => err);
    expect(isRedirectError(error)).toBe(true);
  });

  it("rejects with a not-found error when the session role is client", async () => {
    authMock.mockResolvedValue(makeSession("client-1", "client"));

    const error = await requireProfessional("karla").catch((err) => err);
    expect(isHTTPAccessFallbackError(error)).toBe(true);
  });

  it("returns the session when the role is professional", async () => {
    const session = makeSession("prof-1", "professional");
    authMock.mockResolvedValue(session);

    await expect(requireProfessional("karla")).resolves.toBe(session);
  });
});

describe("requireTenantOwner", () => {
  it("rejects a professional who does not own this tenant", async () => {
    authMock.mockResolvedValue(makeSession("owner-a", "professional"));
    findBySlugMock.mockResolvedValue({ id: "prof-1", ownerUserId: "owner-b" });

    const error = await requireTenantOwner("otra-manicurista").catch((err) => err);
    expect(isHTTPAccessFallbackError(error)).toBe(true);
  });

  it("rejects when the tenant does not exist", async () => {
    authMock.mockResolvedValue(makeSession("owner-a", "professional"));
    findBySlugMock.mockResolvedValue(null);

    const error = await requireTenantOwner("no-existe").catch((err) => err);
    expect(isHTTPAccessFallbackError(error)).toBe(true);
  });

  it("returns the session when the professional owns the tenant", async () => {
    const session = makeSession("owner-a", "professional");
    authMock.mockResolvedValue(session);
    findBySlugMock.mockResolvedValue({ id: "prof-1", ownerUserId: "owner-a" });

    await expect(requireTenantOwner("karla")).resolves.toBe(session);
  });
});

describe("requireAdmin", () => {
  it("redirects to /admin/login when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const error = await requireAdmin().catch((err) => err);
    expect(isRedirectError(error)).toBe(true);
  });

  it("redirects to /admin/login when the session role is not admin", async () => {
    authMock.mockResolvedValue(makeSession("prof-1", "professional"));

    const error = await requireAdmin().catch((err) => err);
    expect(isRedirectError(error)).toBe(true);
  });

  it("returns the session when the role is admin", async () => {
    const session = makeSession("admin-1", "admin");
    authMock.mockResolvedValue(session);

    await expect(requireAdmin()).resolves.toBe(session);
  });
});
