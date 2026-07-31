import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  ConfigureDesignElementsUseCase,
  DesignElementNotFoundError,
  InvalidColorHexError,
} from "@/server/application/design/configure-design-elements.use-case";
import { ListDesignElementsUseCase } from "@/server/application/design/list-design-elements.use-case";
import { DrizzleDesignRepository } from "@/server/infrastructure/repositories/drizzle-design.repository";
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

const categorySchema = z.enum(["color", "finish", "decoration", "technique"]);

const createElementSchema = z.object({
  category: categorySchema,
  code: z.string().min(1),
  label: z.string().min(1),
  colorHex: z.string().nullable().optional(),
  priceDeltaClp: z.number().int().min(0).optional(),
  extraMinutes: z.number().int().min(0).optional(),
  sortOrder: z.number().int().optional(),
});

const patchElementSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).optional(),
  colorHex: z.string().nullable().optional(),
  priceDeltaClp: z.number().int().min(0).optional(),
  extraMinutes: z.number().int().min(0).optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function GET(request: Request) {
  const { professional, response } = await requireOwnedProfessional();
  if (!professional) return response;

  const { searchParams } = new URL(request.url);
  const onlyActive = searchParams.get("onlyActive") === "true";

  const elements = await new ListDesignElementsUseCase(new DrizzleDesignRepository()).execute(professional.id, {
    onlyActive,
  });
  return NextResponse.json({ elements });
}

export async function POST(request: Request) {
  const { professional, response } = await requireOwnedProfessional();
  if (!professional) return response;

  const body = await request.json();
  const parsed = createElementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const useCase = new ConfigureDesignElementsUseCase(new DrizzleDesignRepository());
  try {
    const element = await useCase.create({ professionalId: professional.id, ...parsed.data });
    return NextResponse.json({ element }, { status: 201 });
  } catch (err) {
    if (err instanceof InvalidColorHexError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function PATCH(request: Request) {
  const { professional, response } = await requireOwnedProfessional();
  if (!professional) return response;

  const body = await request.json();
  const parsed = patchElementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const { id, ...patch } = parsed.data;
  const useCase = new ConfigureDesignElementsUseCase(new DrizzleDesignRepository());
  try {
    const element = await useCase.update({ id, professionalId: professional.id, patch });
    return NextResponse.json({ element });
  } catch (err) {
    if (err instanceof InvalidColorHexError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof DesignElementNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
