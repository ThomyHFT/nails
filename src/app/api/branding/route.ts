import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  ConfigureTenantBrandingUseCase,
  InvalidArchetypeError,
  InvalidColorHexError,
  InvalidFontPairError,
  InvalidImageUrlError,
} from "@/server/application/branding/configure-tenant-branding.use-case";
import { GetTenantBrandingUseCase } from "@/server/application/branding/get-tenant-branding.use-case";
import { DrizzleBrandingRepository } from "@/server/infrastructure/repositories/drizzle-branding.repository";
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

const archetypeSchema = z.enum(["minimal_nude", "glam", "editorial", "pastel_soft"]);
const fontPairSchema = z.enum([
  "playfair_jakarta",
  "cormorant_inter",
  "dmserif_outfit",
  "jakarta_solo",
  "fraunces_nunito",
]);

const putBrandingSchema = z.object({
  archetype: archetypeSchema,
  primaryColorHex: z.string().nullable(),
  onPrimaryColorHex: z.string().nullable(),
  fontPair: fontPairSchema.nullable(),
  logoUrl: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
});

export async function GET() {
  const { professional, response } = await requireOwnedProfessional();
  if (!professional) return response;

  const branding = await new GetTenantBrandingUseCase(new DrizzleBrandingRepository()).execute(professional.id);
  return NextResponse.json({ branding });
}

export async function PUT(request: Request) {
  const { professional, response } = await requireOwnedProfessional();
  if (!professional) return response;

  const body = await request.json();
  const parsed = putBrandingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const useCase = new ConfigureTenantBrandingUseCase(new DrizzleBrandingRepository());
  try {
    const branding = await useCase.execute({ professionalId: professional.id, ...parsed.data });
    return NextResponse.json({ branding });
  } catch (err) {
    if (
      err instanceof InvalidColorHexError ||
      err instanceof InvalidImageUrlError ||
      err instanceof InvalidArchetypeError ||
      err instanceof InvalidFontPairError
    ) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
