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
  // SPEC 20: por defecto se entra con un código por correo; la contraseña
  // queda como alternativa para quien ya tiene una (y para la profesional).
  const [mode, setMode] = useState<"code" | "password">("code");
  const [codeSent, setCodeSent] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [info, setInfo] = useState<string | null>(null);

  // A dónde mandar a alguien logueado cuando no vino de un link con "next":
  // la profesional a su panel, la clienta a sus reservas. Antes esto no
  // existía y quien iniciaba sesión sin "next" quedaba parada en "ya
  // iniciaste sesión" sin ningún link hacia adelante.
  function defaultDestination(role: string) {
    return role === "professional" ? `/${params.slug}/admin` : `/${params.slug}/cuenta`;
  }

  async function requestCode(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, slug: params.slug }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data.error === "string" ? data.error : "No pudimos enviar el código.");
        return;
      }
      setIsNewClient(Boolean(data.isNewClient));
      setCodeSent(true);
      setInfo(`Te enviamos un código a ${email}. Revisa también spam.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signIn("email-code", {
        email,
        code,
        name: isNewClient ? name : "",
        phone: isNewClient ? phone : "",
        redirect: false,
      });
      if (result?.error) {
        setError("El código no es válido o ya venció. Revísalo o pide uno nuevo.");
        return;
      }
      const freshSession = await getSession();
      router.push(next ?? defaultDestination(freshSession?.user.role ?? "client"));
    } finally {
      setIsSubmitting(false);
    }
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
      description="Entra para reservar, ver tus reservas y dejar tu opinión."
      footer={
        <div className="flex flex-col items-center gap-3">
          <ActionLink href={registroHref}>¿No tienes cuenta? Crear cuenta</ActionLink>
          <ActionLink href={`/${params.slug}/recuperar`}>Olvidé mi contraseña</ActionLink>
        </div>
      }
    >
      {mode === "code" && !codeSent && (
        <form onSubmit={requestCode} className="flex flex-col gap-5">
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            hint="Te enviamos un código de 6 dígitos. Sin contraseñas."
            required
          />
          {error && <Caption className="text-destructive">{error}</Caption>}
          <BrandButton type="submit" size="lg" fullWidth disabled={isSubmitting}>
            {isSubmitting ? "Enviando…" : "Recibir un código"}
          </BrandButton>
          <BrandButton type="button" variant="ghost" fullWidth onClick={() => { setMode("password"); setError(null); }}>
            Entrar con contraseña
          </BrandButton>
        </form>
      )}

      {mode === "code" && codeSent && (
        <form onSubmit={submitCode} className="flex flex-col gap-5">
          {info && <Caption>{info}</Caption>}
          <TextField
            label="Código"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
          />
          {isNewClient && (
            <>
              <Caption>Es tu primera vez: cuéntanos cómo te llamas y dónde contactarte.</Caption>
              <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" minLength={2} required />
              <TextField
                label="Teléfono"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="+56 9 1234 5678"
                required
              />
            </>
          )}
          {error && <Caption className="text-destructive">{error}</Caption>}
          <BrandButton type="submit" size="lg" fullWidth disabled={isSubmitting || code.length !== 6}>
            {isSubmitting ? "Ingresando…" : "Ingresar"}
          </BrandButton>
          <div className="flex justify-between gap-3">
            <BrandButton type="button" variant="ghost" size="sm" onClick={() => { setCodeSent(false); setCode(""); setError(null); }}>
              Cambiar correo
            </BrandButton>
            <BrandButton type="button" variant="ghost" size="sm" disabled={isSubmitting} onClick={() => void requestCode()}>
              Reenviar código
            </BrandButton>
          </div>
        </form>
      )}

      {mode === "password" && (
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
          <BrandButton type="button" variant="ghost" fullWidth onClick={() => { setMode("code"); setError(null); }}>
            Recibir un código en su lugar
          </BrandButton>
        </form>
      )}
    </AuthCard>
  );
}
