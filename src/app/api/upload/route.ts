import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await auth();
        if (!session || session.user.role !== "professional") {
          throw new Error("No autorizado");
        }
        const professional = await new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id);
        if (!professional) {
          throw new Error("No autorizado");
        }

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
        };
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
