"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthCard, BrandButton, Caption, TextField } from "@/components/brand";

export default function RecuperarTokenPage() {
  const router = useRouter();
  const params = useParams<{ slug: string; token: string }>();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/password-reset/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(typeof data.error === "string" ? data.error : "No se pudo cambiar la contraseña.");
        return;
      }

      setDone(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthCard title="Contraseña actualizada" description="Ya puedes iniciar sesión con tu nueva contraseña.">
        <BrandButton size="lg" fullWidth onClick={() => router.push(`/${params.slug}/login`)}>
          Iniciar sesión
        </BrandButton>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Elige tu nueva contraseña" description="Mínimo 8 caracteres.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField
          label="Nueva contraseña"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
        />

        <TextField
          label="Confirmar contraseña"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
        />

        {error && <Caption className="text-destructive">{error}</Caption>}

        <BrandButton type="submit" size="lg" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : "Guardar contraseña"}
        </BrandButton>
      </form>
    </AuthCard>
  );
}
