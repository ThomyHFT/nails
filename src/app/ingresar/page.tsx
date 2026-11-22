"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { ActionLink, AuthCard, BrandButton, Caption, TextField } from "@/components/brand";

/**
 * Entrada para la profesional que vuelve. Antes la landing solo ofrecía
 * "Crear mi sitio" y el login vivía en `/<slug>/login`, así que había que
 * recordar la dirección exacta del propio sitio para llegar al panel.
 */
export default function IngresarPage() {
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", { email, password, redirect: false });

      if (result?.error) {
        setError("Email o contraseña incorrectos.");
        return;
      }

      router.push("/ingresar/panel");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "loading") {
    return null;
  }

  if (status === "authenticated") {
    return (
      <main className="flex min-h-screen flex-col">
        {/* Texto neutro: una clienta logueada también puede caer acá, y a ella
            /ingresar/panel la lleva a la portada, no a un panel. */}
        <AuthCard title="Ya iniciaste sesión" description="Tu sesión sigue abierta.">
          <BrandButton size="lg" fullWidth href="/ingresar/panel">
            Continuar
          </BrandButton>
        </AuthCard>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <AuthCard
        title="Ingresar a tu panel"
        description="Con el correo y la contraseña de tu cuenta de profesional."
        footer={
          <div className="flex flex-col items-center gap-3">
            <ActionLink href="/registro-profesional">¿Aún no tienes tu sitio? Crear mi sitio</ActionLink>
            <ActionLink href="/">Volver al inicio</ActionLink>
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
    </main>
  );
}
