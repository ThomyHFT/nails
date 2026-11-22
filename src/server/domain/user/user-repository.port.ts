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
  markEmailVerified(userId: string): Promise<void>;
  updatePhone(userId: string, phone: string): Promise<void>;
  /** Activa una cuenta creada por la profesional: nombre, teléfono y contraseña propios. */
  updateProfile(userId: string, profile: { name: string; phone: string; passwordHash: string }): Promise<void>;
  /** La clienta más reciente con ese teléfono (comparando solo dígitos), para no duplicarla en una reserva manual. */
  findClientByPhone(phone: string): Promise<User | null>;
}
