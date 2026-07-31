import type { NewUser, UserRepository } from "@/server/domain/user/user-repository.port";
import type { User } from "@/server/domain/user/user.entity";

export class InMemoryUserRepository implements UserRepository {
  private readonly usersById = new Map<string, User>();
  private nextId = 1;

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.usersById.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async findById(id: string): Promise<User | null> {
    return this.usersById.get(id) ?? null;
  }

  async create(newUser: NewUser): Promise<User> {
    const now = new Date();
    const user: User = {
      id: String(this.nextId++),
      email: newUser.email,
      passwordHash: newUser.passwordHash,
      name: newUser.name,
      phone: newUser.phone ?? null,
      role: newUser.role,
      emailVerifiedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.usersById.set(user.id, user);
    return user;
  }
}
