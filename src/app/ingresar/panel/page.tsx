import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { homePathForSession } from "@/server/interface/session-home";

/**
 * Paso intermedio de `/ingresar`: el slug de la profesional solo se puede
 * resolver en el servidor, así que el formulario manda acá y esta página
 * redirige al panel que corresponde.
 */
export default async function IngresarPanelPage() {
  const session = await auth();
  if (!session) redirect("/ingresar");

  redirect(await homePathForSession(session));
}
