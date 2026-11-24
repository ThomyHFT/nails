import { NextResponse } from "next/server";
import { TeamError, TeamUseCase } from "@/server/application/staff/team.use-case";
import { DrizzleServicesRepository } from "@/server/infrastructure/repositories/drizzle-services.repository";
import { DrizzleStaffRepository } from "@/server/infrastructure/repositories/drizzle-staff.repository";
import { DrizzleUserRepository } from "@/server/infrastructure/repositories/drizzle-user.repository";

export function teamUseCase() {
  return new TeamUseCase(new DrizzleStaffRepository(), new DrizzleUserRepository(), new DrizzleServicesRepository());
}

/** Errores del equipo (SPEC 22) a HTTP; relanza el resto. */
export function teamErrorResponse(err: unknown): NextResponse {
  if (err instanceof TeamError) return NextResponse.json({ error: err.message }, { status: err.status });
  throw err;
}
