import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionProfessional } from "@/server/interface/session-professional";
import { commerceErrorResponse, giftCardsUseCase, invalid, unauthorized } from "@/app/api/_commerce/wiring";

/** Anular una gift card sin cobros (SPEC 21). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const professional = await getSessionProfessional();
  if (!professional) return unauthorized();
  if (!z.string().uuid().safeParse(id).success) return invalid();
  try {
    await giftCardsUseCase().void(professional.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return commerceErrorResponse(err);
  }
}
