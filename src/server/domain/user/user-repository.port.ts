import type { User, UserRole } from "@/server/domain/user/user.entity";

export interface NewUser {
  email: string;
  passwordHash: string;
  name: string;
  phone?: string | null;
  role: UserRole;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: NewUser): Promise<User>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
}
