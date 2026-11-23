import { NextResponse } from "next/server";
import { ReportUseCase } from "@/server/application/report/report.use-case";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";
import { getSessionProfessional } from "@/server/interface/session-professional";

export const dynamic = "force-dynamic";

/** Descarga en CSV las reservas o las clientas del negocio (SPEC 20). */
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (kind !== "reservas" && kind !== "clientes") return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const professional = await getSessionProfessional();
  if (!professional) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const report = new ReportUseCase(new DrizzleBookingRepository(), new DrizzleUserRepository(), new DrizzleServicesRepository());
  const csv = kind === "reservas" ? await report.bookingsCsv(professional) : await report.clientsCsv(professional);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: professional.timezone }).format(new Date());

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${kind}-${professional.slug}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
