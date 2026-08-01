import { notFound } from "next/navigation";
import Link from "next/link";
import { GetProfessionalBySlugUseCase } from "@/server/application/tenant/get-professional-by-slug.use-case";
import { ListServicesUseCase } from "@/server/application/service/list-services.use-case";
import { priceFromClp } from "@/server/domain/service/price-from";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";

const NAIL_LENGTH_LABELS: Record<string, string> = {
  short: "Corta",
  medium: "Media",
  long: "Larga",
  single: "Única",
};

export default async function ServiciosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const professional = await new GetProfessionalBySlugUseCase(new DrizzleProfessionalRepository()).execute(slug);
  if (!professional) {
    notFound();
  }

  const allServices = await new ListServicesUseCase(new DrizzleServicesRepository()).execute(professional.id);

  const publicServices = allServices
    .filter((s) => s.active)
    .map((s) => ({ ...s, priceFrom: priceFromClp(s.variants) }))
    .filter((s) => s.priceFrom !== null);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--tenant-font-heading)" }}>
        Servicios
      </h1>

      {publicServices.length === 0 && (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Todavía no hay servicios publicados.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {publicServices.map((service) => (
          <div
            key={service.id}
            className="flex flex-col gap-3 p-4"
            style={{
              background: "var(--card)",
              color: "var(--card-foreground)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium" style={{ fontFamily: "var(--tenant-font-heading)" }}>
                {service.name}
              </span>
              <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                Desde ${service.priceFrom!.toLocaleString("es-CL")}
              </span>
            </div>
            {service.description && (
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                {service.description}
              </p>
            )}
            <ul className="flex flex-col gap-1 text-sm">
              {service.variants
                .filter((v) => v.active)
                .map((v) => (
                  <li key={v.id} className="flex justify-between">
                    <span>
                      {NAIL_LENGTH_LABELS[v.nailLength]} · {v.durationMinutes} min
                    </span>
                    <span>${v.priceClp.toLocaleString("es-CL")}</span>
                  </li>
                ))}
            </ul>
            <Link
              href={`/${slug}/reservar?service=${service.id}`}
              className="w-fit px-4 py-1.5 text-sm font-medium"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                borderRadius: "var(--radius)",
              }}
            >
              Reservar
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
