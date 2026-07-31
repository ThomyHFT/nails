import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function CuentaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();

  if (!session) {
    redirect(`/${slug}/login`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Mi cuenta</h1>
      <p>
        Sesión iniciada como <strong>{session.user.email}</strong>
      </p>
    </div>
  );
}
