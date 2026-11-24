import { NextResponse } from "next/server";
import { authorizeBookingAction } from "@/app/api/bookings/_shared/authorize";
import { ConfirmBookingUseCase } from "@/server/application/booking/confirm-booking.use-case";
import { BookingInvalidStateError, BookingNotFoundError, BookingNotOwnedError } from "@/server/application/booking/booking-guard-errors";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { afterBookingConfirmed } from "@/app/api/bookings/_shared/after-confirm";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // SPEC 22: la dueña o la integrante asignada.
  const { professional, response } = await authorizeBookingAction(id);
  if (!professional) return response;

  try {
    const booking = await new ConfirmBookingUseCase(new DrizzleBookingRepository()).execute(id, professional.id);
    await afterBookingConfirmed(booking.id);
    return NextResponse.json({ booking });
  } catch (err) {
    if (err instanceof BookingNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof BookingNotOwnedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof BookingInvalidStateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
