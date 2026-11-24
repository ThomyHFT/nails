import { NextResponse } from "next/server";
import { authorizeBookingAction } from "@/app/api/bookings/_shared/authorize";
import { CompleteBookingUseCase } from "@/server/application/booking/complete-booking.use-case";
import {
  BookingInvalidStateError,
  BookingNotFoundError,
  BookingNotOwnedError,
  BookingTooEarlyError,
} from "@/server/application/booking/booking-guard-errors";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // SPEC 22: la dueña o la integrante asignada.
  const { professional, response } = await authorizeBookingAction(id);
  if (!professional) return response;

  const useCase = new CompleteBookingUseCase(new DrizzleBookingRepository());
  try {
    const booking = await useCase.execute(id, professional.id);
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
    if (err instanceof BookingTooEarlyError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
