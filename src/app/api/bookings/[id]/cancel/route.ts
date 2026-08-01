import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CancelBookingByClientUseCase } from "@/server/application/booking/cancel-booking.use-case";
import { BookingNotFoundError, BookingNotOwnedError } from "@/server/application/booking/booking-guard-errors";
import { SendBookingNotificationUseCase } from "@/server/application/notification/send-booking-notification.use-case";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { DrizzleBrandingRepository } from "@/server/infrastructure/repositories/drizzle-branding.repository";
import { DrizzleEmailNotificationRepository } from "@/server/infrastructure/repositories/drizzle-email-notification.repository";
import { ResendEmailSender } from "@/server/infrastructure/email/resend-email-sender";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session || session.user.role !== "client") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const bookingRepository = new DrizzleBookingRepository();
  const useCase = new CancelBookingByClientUseCase(bookingRepository);
  try {
    const booking = await useCase.execute(id, session.user.id);

    try {
      const notificationUseCase = new SendBookingNotificationUseCase(
        bookingRepository,
        new DrizzleUserRepository(),
        new DrizzleProfessionalRepository(),
        new DrizzleBrandingRepository(),
        new ResendEmailSender(process.env.RESEND_API_KEY ?? "", process.env.EMAIL_FROM_ADDRESS ?? "onboarding@resend.dev"),
        new DrizzleEmailNotificationRepository(),
      );
      await notificationUseCase.execute({ bookingId: booking.id, type: "cancellation" });
    } catch {
      // Un fallo al notificar nunca debe cambiar la respuesta de cancelar la reserva.
    }

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
