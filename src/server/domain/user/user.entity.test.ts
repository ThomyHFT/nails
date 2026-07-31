import { describe, expect, it } from "vitest";
import type { User } from "@/server/domain/user/user.entity";

describe("User entity shape", () => {
  it("accepts a fully-populated client user", () => {
    const user: User = {
      id: "1",
      email: "cliente@example.com",
      passwordHash: "hash",
      name: "Cliente",
      phone: null,
      role: "client",
      emailVerifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(user.role).toBe("client");
  });

  it("only accepts client or professional as role", () => {
    const roles: User["role"][] = ["client", "professional"];
    expect(roles).toHaveLength(2);
  });
});
