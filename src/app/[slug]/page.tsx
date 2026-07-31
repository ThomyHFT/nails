import { notFound } from "next/navigation";
import { GetProfessionalBySlugUseCase } from "@/server/application/tenant/get-professional-by-slug.use-case";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

export default async function TenantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const useCase = new GetProfessionalBySlugUseCase(new DrizzleProfessionalRepository());
  const professional = await useCase.execute(slug);

  if (!professional) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">{professional.businessName}</h1>
      {professional.bio && <p className="max-w-md text-center text-muted-foreground">{professional.bio}</p>}
    </div>
  );
}
