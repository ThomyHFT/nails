import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { LeaveWaitlistUseCase, WaitlistEntryNotFoundError } from "@/server/application/waitlist/waitlist.use-case";
import { DrizzleWaitlistRepository } from "@/server/infrastructure/repositories/drizzle-waitlist.repository";

/** Salir de la lista de espera (SPEC 21). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session || session.user.role !== "client") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    await new LeaveWaitlistUseCase(new DrizzleWaitlistRepository()).execute(id, session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof WaitlistEntryNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
