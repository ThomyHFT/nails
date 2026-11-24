import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionProfessional } from "@/server/interface/session-professional";
import { commerceErrorResponse, giftCardsUseCase, invalid, unauthorized } from "@/app/api/_commerce/wiring";

const schema = z.object({
  amountClp: z.number().int(),
  buyerName: z.string().max(200),
  recipientName: z.string().max(200),
  message: z.string().max(1000).nullable().optional(),
  /** Día local `YYYY-MM-DD`: vence al terminar ese día en la zona de la profesional. */
  expiresOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

/** Emitir una gift card después de recibir el pago (SPEC 21). */
export async function POST(request: Request) {
  const professional = await getSessionProfessional();
  if (!professional) return unauthorized();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid();

  // Fin del día elegido, aproximado en UTC−3/−4: a esta escala no importa una hora.
  const expiresAt = parsed.data.expiresOn ? new Date(`${parsed.data.expiresOn}T23:59:59-04:00`) : null;
  try {
    const card = await giftCardsUseCase().issue(professional.id, { ...parsed.data, expiresAt });
    return NextResponse.json({ giftCard: card }, { status: 201 });
  } catch (err) {
    return commerceErrorResponse(err);
  }
}
