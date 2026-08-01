import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  ConfigurePortfolioUseCase,
  InvalidImageUrlError,
  PortfolioItemNotFoundError,
  ServiceNotOwnedError,
} from "@/server/application/portfolio/configure-portfolio.use-case";
import { ListPortfolioUseCase } from "@/server/application/portfolio/list-portfolio.use-case";
import { DrizzlePortfolioRepository } from "@/server/infrastructure/repositories/drizzle-portfolio.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import { VercelBlobStorage } from "@/server/infrastructure/storage/vercel-blob-storage";

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

function buildUseCase() {
  return new ConfigurePortfolioUseCase(
    new DrizzlePortfolioRepository(),
    new DrizzleServicesRepository(),
    new VercelBlobStorage(),
  );
}

function errorResponse(err: unknown) {
  if (err instanceof InvalidImageUrlError || err instanceof ServiceNotOwnedError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof PortfolioItemNotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
  throw err;
}

const createSchema = z.object({
  imageUrl: z.string(),
  caption: z.string().nullable().optional(),
  serviceId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  caption: z.string().nullable().optional(),
  serviceId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
  published: z.boolean().optional(),
});

export async function GET() {
  const { professional, response } = await requireOwnedProfessional();
  if (!professional) return response;

  const items = await new ListPortfolioUseCase(new DrizzlePortfolioRepository()).execute(professional.id);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const { professional, response } = await requireOwnedProfessional();
  if (!professional) return response;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  try {
    const item = await buildUseCase().create({ professionalId: professional.id, ...parsed.data });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(request: Request) {
  const { professional, response } = await requireOwnedProfessional();
  if (!professional) return response;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const { id, ...patch } = parsed.data;
  try {
    const item = await buildUseCase().update(id, professional.id, patch);
    return NextResponse.json({ item });
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
    return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
  }

  try {
    await buildUseCase().delete(id, professional.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
