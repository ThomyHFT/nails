import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  ConfigureServicesUseCase,
  InvalidServiceNameError,
  ServiceHasBookingsError,
  ServiceNotFoundError,
} from "@/server/application/service/configure-services.use-case";
import { ListServicesUseCase } from "@/server/application/service/list-services.use-case";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

async function requireOwnedProfessional() {
  const session = await auth();
  if (!session || session.user.role !== "professional") {
    return { professional: null, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }

  const professional = await new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id);
  if (!professional) {
    return { professional: null, response: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  }

  return { professional, response: null };
}

const createServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const patchServiceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  const { professional, response } = await requireOwnedProfessional();
  if (!professional) return response;

  const services = await new ListServicesUseCase(new DrizzleServicesRepository()).execute(professional.id);
  return NextResponse.json({ services });
}

export async function POST(request: Request) {
  const { professional, response } = await requireOwnedProfessional();
  if (!professional) return response;

  const body = await request.json();
  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const useCase = new ConfigureServicesUseCase(new DrizzleServicesRepository());
  try {
    const service = await useCase.createService({ professionalId: professional.id, ...parsed.data });
    return NextResponse.json({ service }, { status: 201 });
  } catch (err) {
    if (err instanceof InvalidServiceNameError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function PATCH(request: Request) {
  const { professional, response } = await requireOwnedProfessional();
  if (!professional) return response;

  const body = await request.json();
  const parsed = patchServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const { id, ...patch } = parsed.data;
  const useCase = new ConfigureServicesUseCase(new DrizzleServicesRepository());
  try {
    const service = await useCase.updateService(id, professional.id, patch);
    return NextResponse.json({ service });
  } catch (err) {
    if (err instanceof InvalidServiceNameError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ServiceNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(request: Request) {
  const { professional, response } = await requireOwnedProfessional();
  if (!professional) return response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id es requerido" }, { status: 400 });
  }

  const useCase = new ConfigureServicesUseCase(new DrizzleServicesRepository());
  try {
    await useCase.deleteService(id, professional.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ServiceNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof ServiceHasBookingsError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
