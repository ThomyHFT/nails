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

  async updatePhone(userId: string, phone: string): Promise<void> {
    const user = this.usersById.get(userId);
    if (user) this.usersById.set(userId, { ...user, phone, updatedAt: new Date() });
  }

  async updateContact(userId: string, contact: { name: string; phone: string }): Promise<void> {
    const user = this.usersById.get(userId);
    if (user) this.usersById.set(userId, { ...user, ...contact, updatedAt: new Date() });
  }

  async updateEmail(userId: string, email: string): Promise<void> {
    const user = this.usersById.get(userId);
    if (user) this.usersById.set(userId, { ...user, email, emailVerifiedAt: new Date(), updatedAt: new Date() });
  }

  async findClientByPhone(phone: string): Promise<User | null> {
    const digits = phone.replace(/\D/g, "");
    const matches = [...this.usersById.values()].filter(
      (user) => user.role === "client" && user.phone?.replace(/\D/g, "") === digits,
    );
    return matches.at(-1) ?? null;
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    const user = this.usersById.get(userId);
    if (user) {
      this.usersById.set(userId, { ...user, passwordHash, updatedAt: new Date() });
    }
  }

  async markEmailVerified(userId: string): Promise<void> {
    const user = this.usersById.get(userId);
    if (user) {
      this.usersById.set(userId, { ...user, emailVerifiedAt: new Date(), updatedAt: new Date() });
    }
  }
}
