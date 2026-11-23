import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ClientNoteTooLongError,
  ClientNotFoundError,
  SaveClientNoteUseCase,
} from "@/server/application/client/client-profile.use-case";
import { CLIENT_NOTE_MAX_LENGTH } from "@/server/domain/client/client-note";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleClientNotesRepository } from "@/server/infrastructure/repositories/drizzle-client-notes.repository";
import { getSessionProfessional } from "@/server/interface/session-professional";

const bodySchema = z.object({ body: z.string().max(CLIENT_NOTE_MAX_LENGTH + 100) });

/** Guarda la nota privada de la profesional sobre una clienta (SPEC 20). */
export async function PUT(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const professional = await getSessionProfessional();
  if (!professional) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nota inválida" }, { status: 400 });

  try {
    const note = await new SaveClientNoteUseCase(new DrizzleBookingRepository(), new DrizzleClientNotesRepository()).execute(
      professional.id,
      clientId,
      parsed.data.body,
    );
    return NextResponse.json({ note });
  } catch (err) {
    if (err instanceof ClientNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    if (err instanceof ClientNoteTooLongError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
