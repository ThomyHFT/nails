"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, signIn, signOut, useSession } from "next-auth/react";
import { AuthCard, BrandButton, TextField } from "@/components/brand";

export default function AdminLoginPage() {
  const router = useRouter();
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
      const result = await signIn("credentials", { email, password, redirect: false });

      if (result?.error) {
        setError("Email o contraseña incorrectos.");
        return;
      }

      const freshSession = await getSession();
      if (freshSession?.user.role !== "admin") {
        setError("Esta cuenta no tiene acceso al panel de administración.");
        await signOut({ redirect: false });
        return;
      }

      router.push("/admin");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "loading") {
    return null;
  }

  if (session && session.user.role === "admin") {
    return (
      <AuthCard title="Ya iniciaste sesión" description={`Estás dentro como ${session.user.email}.`}>
        <div className="flex flex-col gap-3">
          <BrandButton size="lg" fullWidth href="/admin">
            Ir al panel
          </BrandButton>
          <BrandButton size="lg" fullWidth variant="outline" onClick={() => signOut({ callbackUrl: "/admin/login" })}>
            Cerrar sesión
          </BrandButton>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Panel de administración" description="Acceso solo para el dueño del producto.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Correo"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <TextField
          label="Contraseña"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <BrandButton type="submit" size="lg" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "Entrando…" : "Entrar"}
        </BrandButton>
      </form>
    </AuthCard>
  );
}
