import { NextResponse } from "next/server";
import { BookingNotFoundError, BookingNotOwnedError } from "@/server/application/booking/booking-guard-errors";
import {
  DepositNotApplicableError,
  MarkDepositReceivedUseCase,
} from "@/server/application/booking/mark-deposit-received.use-case";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { getSessionProfessional } from "@/server/interface/session-professional";
import { afterBookingConfirmed } from "@/app/api/bookings/_shared/after-confirm";

/** "Abono recibido" (SPEC 21): marca el abono y confirma la reserva si estaba pendiente. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const professional = await getSessionProfessional();
  if (!professional) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const result = await new MarkDepositReceivedUseCase(new DrizzleBookingRepository()).execute(id, professional.id);
    if (result.confirmedNow) await afterBookingConfirmed(result.booking.id);
    return NextResponse.json({ booking: result.booking });
  } catch (err) {
    if (err instanceof BookingNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    if (err instanceof BookingNotOwnedError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof DepositNotApplicableError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
