import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ModerateReviewUseCase } from "@/server/application/review/moderate-review.use-case";
import { ReviewNotFoundError } from "@/server/application/review/review-errors";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleReviewsRepository } from "@/server/infrastructure/repositories/drizzle-reviews.repository";

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

  const useCase = new ModerateReviewUseCase(new DrizzleReviewsRepository());
  try {
    const review = await useCase.approve(id, professional.id);
    return NextResponse.json({ review });
  } catch (err) {
    if (err instanceof ReviewNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
