import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { UpdateContactInfoUseCase } from "@/server/application/professional/update-contact-info.use-case";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

const putContactoSchema = z.object({
  phone: z.string().nullable(),
  phoneVisible: z.boolean(),
  address: z.string().nullable(),
  addressVisible: z.boolean(),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "professional") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const professional = await new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id);
  if (!professional) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json({
    phone: professional.phone,
    phoneVisible: professional.phoneVisible,
    address: professional.address,
    addressVisible: professional.addressVisible,
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "professional") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const professional = await new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id);
  if (!professional) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = putContactoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const useCase = new UpdateContactInfoUseCase(new DrizzleProfessionalRepository());
  const updated = await useCase.execute(professional.id, {
    phone: parsed.data.phone?.trim() || null,
    phoneVisible: parsed.data.phoneVisible,
    address: parsed.data.address?.trim() || null,
    addressVisible: parsed.data.addressVisible,
  });

  return NextResponse.json({
    phone: updated.phone,
    phoneVisible: updated.phoneVisible,
    address: updated.address,
    addressVisible: updated.addressVisible,
  });
}
