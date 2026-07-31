import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  AuthenticateUserUseCase,
  InvalidCredentialsError,
} from "@/server/application/auth/authenticate-user.use-case";
import type { UserRole } from "@/server/domain/user/user.entity";
import { env } from "@/server/infrastructure/config/env";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { BcryptPasswordHasher } from "@/server/infrastructure/security/bcrypt-password-hasher";

export const authConfig: NextAuthConfig = {
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const useCase = new AuthenticateUserUseCase(
          new DrizzleUserRepository(),
          new BcryptPasswordHasher(),
        );

        try {
          const user = await useCase.execute({ email, password });
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (err) {
          if (err instanceof InvalidCredentialsError) {
            return null;
          }
          throw err;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      return session;
    },
  },
};
