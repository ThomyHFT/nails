import { CheckCircle2 } from "lucide-react";
import { auth } from "@/auth";
import { DrizzleProfessionalRepository } from "@/server/infrastructure/repositories/drizzle-professional.repository";
import { ActionLink, EmptyState } from "@/components/brand";

/**
 * Destino del link de verificación, ya con la escritura hecha por
 * /api/email-verification/confirm. Si quien llega tiene sesión activa (el
 * caso normal: se registró y verificó desde el mismo dispositivo), la lleva
 * directo a su panel en vez de dejarla parada en una pantalla sin salida.
 */
export default async function VerificadoPage() {
  const session = await auth();
  const professional =
    session?.user.role === "professional"
      ? await new DrizzleProfessionalRepository().findByOwnerUserId(session.user.id)
      : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-16">
      <EmptyState
        icon={<CheckCircle2 />}
        title="¡Correo verificado!"
        description={
          professional
            ? "Tu micrositio ya es público. Puedes ir a tu panel y seguir configurando tu negocio."
            : "Ya puedes iniciar sesión en tu panel."
        }
        action={professional ? <ActionLink href={`/${professional.slug}/admin`}>Ir a mi panel</ActionLink> : undefined}
        className="max-w-md"
      />
    </div>
  );
}
