"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ActionLink, AuthCard, BrandButton, Caption, TextField } from "@/components/brand";

export default function RecuperarPage() {
  const params = useParams<{ slug: string }>();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, slug: params.slug }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(typeof data.error === "string" ? data.error : "No se pudo completar la solicitud.");
        return;
      }

      setSent(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthCard
        title="Revisa tu correo"
        description="Si el correo tiene una cuenta, te enviamos un enlace para elegir una nueva contraseña."
        footer={<ActionLink href={`/${params.slug}/login`}>Volver a iniciar sesión</ActionLink>}
      >
        <BrandButton size="lg" fullWidth variant="outline" onClick={() => setSent(false)}>
          Enviar de nuevo
        </BrandButton>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Recuperar contraseña"
      description="Ingresa tu email y te enviamos un enlace para elegir una nueva contraseña."
      footer={<ActionLink href={`/${params.slug}/login`}>Ya tengo cuenta</ActionLink>}
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

        {error && <Caption className="text-destructive">{error}</Caption>}

        <BrandButton type="submit" size="lg" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "Enviando…" : "Enviar enlace"}
        </BrandButton>
      </form>
    </AuthCard>
  );
}
