import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ConfirmBookingUseCase } from "@/server/application/booking/confirm-booking.use-case";
import { BookingNotFoundError, BookingNotOwnedError } from "@/server/application/booking/booking-guard-errors";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session || session.user.role !== "professional") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const professional = await new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id);
  if (!professional) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const useCase = new ConfirmBookingUseCase(new DrizzleBookingRepository());
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
    throw err;
  }
}
