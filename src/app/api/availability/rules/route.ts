import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { ConfigureAvailabilityRulesUseCase } from "@/server/application/availability/configure-availability-rules.use-case";
import { DrizzleAvailabilityRepository } from "@/server/infrastructure/repositories/drizzle-availability.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

const timePattern = /^\d{2}:\d{2}$/;
const monthPattern = /^\d{4}-\d{2}-01$/;

const configureRulesSchema = z.object({
  // null = horario semanal (se repite todos los meses); un mes = excepción de ese mes (SPEC 18).
  effectiveMonth: z
    .string()
    .regex(monthPattern, "effectiveMonth debe ser el primer día del mes (YYYY-MM-01)")
    .nullable(),
  rules: z.array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      startTime: z.string().regex(timePattern),
      endTime: z.string().regex(timePattern),
    }).refine((rule) => rule.startTime < rule.endTime, { message: "La hora de inicio debe ser anterior a la de término" }),
  ),
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
  // ?month=weekly pide el horario semanal; ?month=YYYY-MM-01, las reglas propias de ese mes.
  const monthParam = searchParams.get("month");
  if (!monthParam || (monthParam !== "weekly" && !monthPattern.test(monthParam))) {
    return NextResponse.json({ error: "month es requerido (weekly o YYYY-MM-01)" }, { status: 400 });
  }
  const effectiveMonth = monthParam === "weekly" ? null : monthParam;

  const rules = await new DrizzleAvailabilityRepository().listRulesByProfessionalAndMonth(
    professional.id,
    effectiveMonth,
  );
  return NextResponse.json({ rules });
}

export async function POST(request: Request) {
  const { professional, response } = await requireOwnedProfessional();
  if (!professional) return response;

  const body = await request.json();
  const parsed = configureRulesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const useCase = new ConfigureAvailabilityRulesUseCase(new DrizzleAvailabilityRepository());
  const rules = await useCase.execute({ professionalId: professional.id, ...parsed.data });
  return NextResponse.json({ rules }, { status: 201 });
}
