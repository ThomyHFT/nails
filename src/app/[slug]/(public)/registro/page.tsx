"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AuthCard, ActionLink, BrandButton, Caption, TextField } from "@/components/brand";

export default function RegistroPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const loginHref = `/${params.slug}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(typeof data.error === "string" ? data.error : "No se pudo completar el registro.");
        return;
      }

      await signIn("credentials", { email, password, redirect: false });
      router.push(next ?? `/${params.slug}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Crear cuenta"
      description="Con tu cuenta reservas hora, sigues el estado de tus citas y dejas tu opinión."
      footer={<ActionLink href={loginHref}>Ya tengo cuenta</ActionLink>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
        />

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
          autoComplete="new-password"
          hint="Mínimo 8 caracteres."
          required
          minLength={8}
        />

        {error && <Caption className="text-destructive">{error}</Caption>}

        <BrandButton type="submit" size="lg" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
        </BrandButton>
      </form>
    </AuthCard>
  );
}
