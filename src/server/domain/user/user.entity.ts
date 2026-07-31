export type UserRole = "client" | "professional";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  phone: string | null;
  role: UserRole;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
