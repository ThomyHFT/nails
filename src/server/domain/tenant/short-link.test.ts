import { describe, expect, it } from "vitest";
import { resolveShortCode, serviceShortCode } from "@/server/domain/tenant/short-link";

const A = { id: "3f2a9c1e-77aa-4b1d-9c3e-000000000001" };
const B = { id: "8b0d44f2-1234-4b1d-9c3e-000000000002" };

describe("short links", () => {
  it("takes the first 8 hex characters of the id", () => {
    expect(serviceShortCode(A.id)).toBe("3f2a9c1e");
  });

  it("resolves case-insensitively and rejects unknown or malformed codes", () => {
    expect(resolveShortCode("3F2A9C1E", [A, B])).toBe(A);
    expect(resolveShortCode("ffffffff", [A, B])).toBeNull();
    expect(resolveShortCode("3f2a", [A, B])).toBeNull();
    expect(resolveShortCode("../admin", [A, B])).toBeNull();
  });

  it("refuses an ambiguous code", () => {
    const twin = { id: "3f2a9c1e-0000-4000-8000-000000000003" };
    expect(resolveShortCode("3f2a9c1e", [A, twin])).toBeNull();
  });
});
