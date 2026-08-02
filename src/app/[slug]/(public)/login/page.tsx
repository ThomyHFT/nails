"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { ActionLink, AuthCard, BrandButton, Caption, TextField } from "@/components/brand";

export default function LoginPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const registroHref = `/${params.slug}/registro${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      }
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
        <BrandButton size="lg" fullWidth variant="outline" onClick={() => signOut({ redirect: false })}>
          Cerrar sesión
        </BrandButton>
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
