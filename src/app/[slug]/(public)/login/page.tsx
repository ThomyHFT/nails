"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn, signOut, useSession } from "next-auth/react";
import { ActionLink, AuthCard, BrandButton, Caption, TextField } from "@/components/brand";

export default function LoginPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const registroHref = `/${params.slug}/registro${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // A dónde mandar a alguien logueado cuando no vino de un link con "next":
  // la profesional a su panel, la clienta a sus reservas. Antes esto no
  // existía y quien iniciaba sesión sin "next" quedaba parada en "ya
  // iniciaste sesión" sin ningún link hacia adelante.
  function defaultDestination(role: string) {
    return role === "professional" ? `/${params.slug}/admin` : `/${params.slug}/cuenta`;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email o contraseña incorrectos.");
        return;
      }

      const freshSession = await getSession();
      router.push(next ?? defaultDestination(freshSession?.user.role ?? "client"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "loading") {
    return null;
  }

  if (session) {
    return (
      <AuthCard title="Ya iniciaste sesión" description={`Estás dentro como ${session.user.email}.`}>
        <div className="flex flex-col gap-3">
          <BrandButton size="lg" fullWidth href={next ?? defaultDestination(session.user.role)}>
            {session.user.role === "professional" ? "Ir a mi panel" : "Ir a mis reservas"}
          </BrandButton>
          <BrandButton
            size="lg"
            fullWidth
            variant="outline"
            onClick={() => signOut({ callbackUrl: `/${params.slug}/login` })}
          >
            Cerrar sesión
          </BrandButton>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Iniciar sesión"
      description="Entra para ver tus reservas y dejar tu opinión."
      footer={
        <div className="flex flex-col items-center gap-3">
          <ActionLink href={registroHref}>¿No tienes cuenta? Crear cuenta</ActionLink>
          <ActionLink href={`/${params.slug}/recuperar`}>Olvidé mi contraseña</ActionLink>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <TextField
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && <Caption className="text-destructive">{error}</Caption>}

        <BrandButton type="submit" size="lg" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "Ingresando…" : "Ingresar"}
        </BrandButton>
      </form>
    </AuthCard>
  );
}
