import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  CreateAvailabilityExceptionUseCase,
  DeleteAvailabilityExceptionUseCase,
} from "@/server/application/availability/configure-availability-exceptions.use-case";
import { DrizzleAvailabilityRepository } from "@/server/infrastructure/repositories/drizzle-availability.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

const timePattern = /^\d{2}:\d{2}$/;
const monthPattern = /^\d{4}-\d{2}-01$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const createExceptionSchema = z.object({
  date: z.string().regex(datePattern),
  kind: z.enum(["blocked", "extra"]),
  startTime: z.string().regex(timePattern).nullable().optional(),
  endTime: z.string().regex(timePattern).nullable().optional(),
  note: z.string().nullable().optional(),
});

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

export async function GET(request: Request) {
  const { professional, response } = await requireOwnedProfessional();
  if (!professional) return response;

  const { searchParams } = new URL(request.url);
  const effectiveMonth = searchParams.get("month");
  if (!effectiveMonth || !monthPattern.test(effectiveMonth)) {
    return NextResponse.json({ error: "month es requerido (YYYY-MM-01)" }, { status: 400 });
  }

  const exceptions = await new DrizzleAvailabilityRepository().listExceptionsByProfessionalInMonth(
    professional.id,
    effectiveMonth,
  );
  return NextResponse.json({ exceptions });
}

export async function POST(request: Request) {
  const { professional, response } = await requireOwnedProfessional();
  if (!professional) return response;

  const body = await request.json();
  const parsed = createExceptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const useCase = new CreateAvailabilityExceptionUseCase(new DrizzleAvailabilityRepository());
  const exception = await useCase.execute({ professionalId: professional.id, ...parsed.data });
  return NextResponse.json({ exception }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { professional, response } = await requireOwnedProfessional();
  if (!professional) return response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id es requerido" }, { status: 400 });
  }

  const useCase = new DeleteAvailabilityExceptionUseCase(new DrizzleAvailabilityRepository());
  await useCase.execute(id, professional.id);
  return NextResponse.json({ ok: true });
}
