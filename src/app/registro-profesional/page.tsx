"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Check, X } from "lucide-react";
import { suggestSlug } from "@/server/domain/tenant/reserved-slugs";
import { VERTICALS, type Vertical } from "@/server/domain/tenant/vertical";
import { ActionLink, AuthCard, BrandButton, Caption, OptionCard, TextField } from "@/components/brand";

type SlugStatus = "idle" | "checking" | "available" | "taken";

export default function RegistroProfesionalPage() {
  const router = useRouter();
  const [vertical, setVertical] = useState<Vertical>("nails");
  const [inviteCode, setInviteCode] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const checkId = useRef(0);

  function handleBusinessNameChange(value: string) {
    setBusinessName(value);
    // El slug sigue al nombre del negocio mientras la clienta no lo haya
    // tocado a mano; apenas lo edita, deja de seguir — nadie quiere que le
    // pisen lo que acaba de escribir.
    if (!slugTouched) {
      setSlug(suggestSlug(value));
    }
  }

  useEffect(() => {
    if (!slug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con el slug que acaba de vaciarse, no hay estado previo que preservar
      setSlugStatus("idle");
      return;
    }

    setSlugStatus("checking");
    const id = ++checkId.current;
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/professionals/slug-disponible?slug=${encodeURIComponent(slug)}`);
        const data = await response.json();
        if (checkId.current !== id) return; // llegó una respuesta vieja, se descarta
        setSlugStatus(data.available ? "available" : "taken");
      } catch {
        if (checkId.current === id) setSlugStatus("idle");
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [slug]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/professionals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode, slug, businessName, vertical, name, email, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(typeof data?.error === "string" ? data.error : "No se pudo completar el registro.");
        return;
      }

      await signIn("credentials", { email, password, redirect: false });
      router.push(`/${data.slug}/admin`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AuthCard
        title="Crea tu cuenta"
        description="Configura tu negocio ahora; tu sitio se publica apenas verifiques el correo."
        footer={<ActionLink href="/">¿Ya tienes cuenta? Inicia sesión desde tu sitio</ActionLink>}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Primero: decide qué catálogo recibe la cuenta, así que va antes
              que slug o contraseña — no al final como un trámite extra. */}
          <div className="flex flex-col gap-2">
            <span className="t-label text-muted-foreground">¿A qué te dedicas?</span>
            <div className="grid grid-cols-3 gap-2">
              {VERTICALS.map((option) => (
                <OptionCard
                  key={option.value}
                  label={option.label}
                  selected={vertical === option.value}
                  onSelect={() => setVertical(option.value)}
                />
              ))}
            </div>
          </div>

          <TextField
            label="Código de invitación"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            autoComplete="off"
            required
          />

          <TextField
            label="Nombre de tu negocio"
            value={businessName}
            onChange={(e) => handleBusinessNameChange(e.target.value)}
            placeholder="Ej: Uñas por Karla"
            autoComplete="organization"
            required
          />

          <label className="flex flex-col gap-2">
            <span className="t-label text-muted-foreground">Dirección de tu sitio</span>
            <div className="flex items-center gap-2">
              <input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase());
                }}
                required
                className="t-body h-11 w-full rounded-lg border border-outline-variant bg-background px-4 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {slugStatus === "available" && <Check className="size-5 shrink-0 text-success" aria-hidden />}
              {slugStatus === "taken" && <X className="size-5 shrink-0 text-destructive" aria-hidden />}
            </div>
            <Caption className="text-xs">
              agendaunas.cl/{slug || "tu-negocio"}
              {slugStatus === "taken" && <span className="text-destructive"> · no disponible</span>}
              {slugStatus === "checking" && " · comprobando…"}
            </Caption>
          </label>

          <TextField label="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />

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

          <BrandButton type="submit" size="lg" fullWidth disabled={isSubmitting || slugStatus === "taken"}>
            {isSubmitting ? "Creando tu cuenta…" : "Crear cuenta"}
          </BrandButton>
        </form>
      </AuthCard>
    </div>
  );
}
