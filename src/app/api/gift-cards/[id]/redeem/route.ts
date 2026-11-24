import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionProfessional } from "@/server/interface/session-professional";
import { commerceErrorResponse, giftCardsUseCase, invalid, unauthorized } from "@/app/api/_commerce/wiring";

const schema = z.object({ amountClp: z.number().int().positive() });

/** Cobrar un monto de la gift card (SPEC 21). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const professional = await getSessionProfessional();
  if (!professional) return unauthorized();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return invalid();
  try {
    const card = await giftCardsUseCase().redeem(professional.id, id, parsed.data.amountClp);
    return NextResponse.json({ giftCard: card });
  } catch (err) {
    return commerceErrorResponse(err);
  }
}
