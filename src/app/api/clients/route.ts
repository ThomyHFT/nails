import { NextResponse } from "next/server";
import { z } from "zod";
import {
  EmailAlreadyRegisteredError,
  RegisterClientUseCase,
} from "@/server/application/auth/register-client.use-case";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { BcryptPasswordHasher } from "@/server/infrastructure/security/bcrypt-password-hasher";

const registerClientSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  name: z.string().min(1, "El nombre es requerido"),
  phone: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerClientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const useCase = new RegisterClientUseCase(
    new DrizzleUserRepository(),
    new BcryptPasswordHasher(),
  );

  try {
    const user = await useCase.execute(parsed.data);
    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof EmailAlreadyRegisteredError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
