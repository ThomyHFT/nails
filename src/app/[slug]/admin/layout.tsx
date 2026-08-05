import { requireTenantOwner } from "@/server/interface/guards";
import { ListReviewsUseCase } from "@/server/application/review/list-reviews.use-case";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleReviewsRepository } from "@/server/infrastructure/repositories/drizzle-reviews.repository";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleGoogleCalendarConnectionRepository } from "@/server/infrastructure/repositories/drizzle-google-calendar-connection.repository";
import { AesTokenCipher } from "@/server/infrastructure/security/aes-token-cipher";
import { env } from "@/server/infrastructure/config/env";
import { AdminNav } from "@/app/[slug]/admin/AdminNav";
import { AccountBanners } from "@/app/[slug]/admin/AccountBanners";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireTenantOwner(slug);

  const professional = await new DrizzleProfessionalRepository().findBySlug(slug);
  const pendingReviewsCount = professional
    ? await new ListReviewsUseCase(new DrizzleReviewsRepository()).countPending(professional.id)
    : 0;
  const pendingBookingsCount = professional
    ? await new DrizzleBookingRepository().countPending(professional.id)
    : 0;

  const now = new Date();
  const daysUntilTrialEnds = professional?.trialEndsAt
    ? Math.ceil((professional.trialEndsAt.getTime() - now.getTime()) / DAY_MS)
    : null;

  let isCalendarRevoked = false;
  if (professional && env.GOOGLE_CLIENT_ID && env.CALENDAR_TOKEN_KEY) {
    const cipher = new AesTokenCipher(Buffer.from(env.CALENDAR_TOKEN_KEY, "base64"));
    const connection = await new DrizzleGoogleCalendarConnectionRepository(cipher).findByProfessionalId(
      professional.id,
    );
    isCalendarRevoked = connection?.status === "revoked";
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminNav
        slug={slug}
        vertical={professional?.vertical ?? "nails"}
        pendingBookingsCount={pendingBookingsCount}
        pendingReviewsCount={pendingReviewsCount}
      />
      <main className="flex min-w-0 flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
        {professional && (
          <AccountBanners
            isPublished={professional.publishedAt !== null}
            daysUntilTrialEnds={daysUntilTrialEnds}
            isCalendarRevoked={isCalendarRevoked}
          />
        )}
        {children}
      </main>
    </div>
  );
}
