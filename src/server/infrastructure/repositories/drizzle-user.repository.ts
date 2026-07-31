import { eq } from "drizzle-orm";
import { db } from "@/server/infrastructure/db/client";
import { users } from "@/server/infrastructure/db/schema/users";
import type { User } from "@/server/domain/user/user.entity";
import type { NewUser, UserRepository } from "@/server/domain/user/user-repository.port";

function toDomain(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    name: row.name,
    phone: row.phone,
    role: row.role,
    emailVerifiedAt: row.emailVerifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return row ? toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async create(newUser: NewUser): Promise<User> {
    const [row] = await db
      .insert(users)
      .values({
        email: newUser.email,
        passwordHash: newUser.passwordHash,
        name: newUser.name,
        phone: newUser.phone ?? null,
        role: newUser.role,
      })
      .returning();
    return toDomain(row);
  }
}
