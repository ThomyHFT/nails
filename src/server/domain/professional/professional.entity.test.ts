import { describe, expect, it } from "vitest";
import type { Professional } from "@/server/domain/professional/professional.entity";

describe("Professional entity shape", () => {
  it("accepts a fully-populated professional", () => {
    const professional: Professional = {
      id: "1",
      slug: "karla",
      ownerUserId: "user-1",
      businessName: "Uñas por Karla",
      bio: null,
      phone: null,
      instagramHandle: null,
      timezone: "America/Santiago",
      active: true,
      bufferMinutes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(professional.slug).toBe("karla");
    expect(professional.active).toBe(true);
  });
});
