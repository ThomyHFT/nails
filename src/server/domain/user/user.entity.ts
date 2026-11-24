/** `staff`: integrante de un salón con acceso limitado a lo suyo (SPEC 22). */
export type UserRole = "client" | "professional" | "admin" | "staff";

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
