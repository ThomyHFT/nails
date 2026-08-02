import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  ConfigureServicesUseCase,
  DuplicateNailLengthError,
  InvalidDurationError,
  InvalidNailLengthError,
  InvalidPriceError,
  ServiceNotFoundError,
  VariantHasBookingsError,
  VariantNotFoundError,
} from "@/server/application/service/configure-services.use-case";
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

const nailLengthSchema = z.enum(["short", "medium", "long", "single"]);

const createVariantSchema = z.object({
  serviceId: z.string().uuid(),
  nailLength: nailLengthSchema,
  priceClp: z.number(),
  durationMinutes: z.number(),
});

const patchVariantSchema = z.object({
  id: z.string().uuid(),
  priceClp: z.number().optional(),
  durationMinutes: z.number().optional(),
  active: z.boolean().optional(),
});

function errorResponse(err: unknown) {
  if (
    err instanceof InvalidPriceError ||
    err instanceof InvalidDurationError ||
    err instanceof InvalidNailLengthError ||
    err instanceof DuplicateNailLengthError
  ) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof ServiceNotFoundError || err instanceof VariantNotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
  if (err instanceof VariantHasBookingsError) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }
  throw err;
}

export async function POST(request: Request) {
  const { professional, response } = await requireOwnedProfessional();
  if (!professional) return response;

  const body = await request.json();
  const parsed = createVariantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const useCase = new ConfigureServicesUseCase(new DrizzleServicesRepository());
  try {
    const variant = await useCase.createVariant({ professionalId: professional.id, ...parsed.data });
    return NextResponse.json({ variant }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(request: Request) {
  const { professional, response } = await requireOwnedProfessional();
  if (!professional) return response;

  const body = await request.json();
  const parsed = patchVariantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const { id, ...patch } = parsed.data;
  const useCase = new ConfigureServicesUseCase(new DrizzleServicesRepository());
  try {
    const variant = await useCase.updateVariant(id, professional.id, patch);
    return NextResponse.json({ variant });
  } catch (err) {
    return errorResponse(err);
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
    await useCase.deleteVariant(id, professional.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
