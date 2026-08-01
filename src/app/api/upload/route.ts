import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DrizzleBookingRepository } from "@/server/infrastructure/repositories/drizzle-booking.repository";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const TOKEN_OPTIONS = {
  allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
  maximumSizeInBytes: MAX_UPLOAD_BYTES,
  addRandomSuffix: true,
};

async function canUploadAsReviewClient(clientUserId: string, clientPayload: string | null): Promise<boolean> {
  if (!clientPayload) return false;
  let bookingId: string | undefined;
  try {
    bookingId = (JSON.parse(clientPayload) as { bookingId?: string }).bookingId;
  } catch {
    return false;
  }
  if (!bookingId) return false;

  const booking = await new DrizzleBookingRepository().findById(bookingId);
  return !!booking && booking.clientUserId === clientUserId && booking.status === "completed";
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const session = await auth();
        if (!session) {
          throw new Error("No autorizado");
        }

        if (session.user.role === "professional") {
          const professional = await new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id);
          if (!professional) {
            throw new Error("No autorizado");
          }
          return TOKEN_OPTIONS;
        }

        if (session.user.role === "client" && (await canUploadAsReviewClient(session.user.id, clientPayload))) {
          return TOKEN_OPTIONS;
        }

        throw new Error("No autorizado");
      },
      onUploadCompleted: async () => {
        // La persistencia no cuelga de este callback: Vercel lo llama contra
        // la URL pública del deploy, así que no dispara en localhost. El
        // cliente hace un POST explícito a nuestra API con la URL subida.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
