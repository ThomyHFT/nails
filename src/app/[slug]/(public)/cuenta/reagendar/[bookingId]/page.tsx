import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { isWithinClientChangeWindow } from "@/server/domain/professional/booking-policy";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { RescheduleForm } from "@/app/[slug]/(public)/cuenta/reagendar/[bookingId]/RescheduleForm";
import { Caption, Container, Display, Section } from "@/components/brand";

export default async function ReagendarPage({ params }: { params: Promise<{ slug: string; bookingId: string }> }) {
  const { slug, bookingId } = await params;
  const session = await auth();
  if (!session) redirect(`/${slug}/login`);
  if (session.user.role !== "client") notFound();

  const [booking, professional] = await Promise.all([
    new DrizzleBookingRepository().findById(bookingId),
    new DrizzleProfessionalRepository().findBySlug(slug),
  ]);
  if (
    !booking ||
    !professional ||
    booking.clientUserId !== session.user.id ||
    booking.professionalId !== professional.id ||
    (booking.status !== "pending" && booking.status !== "confirmed")
  ) {
    notFound();
  }
  // Fuera de plazo la cuenta ya no ofrece el botón; si llegan por URL, vuelven.
  if (!isWithinClientChangeWindow(professional.bookingPolicy, booking.startsAt)) redirect(`/${slug}/cuenta`);

  const current = booking.startsAt.toLocaleString("es-CL", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: professional.timezone,
  });

  return (
    <Container size="md">
      <Section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Display as="h1">Reagendar tu cita</Display>
          <Caption>Hoy está agendada para el {current}. Elige otro día y hora: el servicio y el precio no cambian.</Caption>
        </div>
        <RescheduleForm slug={slug} bookingId={booking.id} timezone={professional.timezone} />
      </Section>
    </Container>
  );
}
