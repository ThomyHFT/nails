"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { BrandButton } from "@/components/brand";
import { cn } from "@/lib/utils";

/**
 * Avisos de estado de la cuenta. Nunca bloquean el panel — ver SPEC 11: la
 * verificación de correo y el vencimiento de la prueba apagan el micrositio
 * público, no el acceso acá adentro.
 */
export function AccountBanners({
  isPublished,
  daysUntilTrialEnds,
  isCalendarRevoked = false,
}: {
  isPublished: boolean;
  /** `null` = sin vencimiento. Negativo o cero = ya venció. */
  daysUntilTrialEnds: number | null;
  isCalendarRevoked?: boolean;
}) {
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  async function resendVerification() {
    if (isResending) return;
    setIsResending(true);
    setResendStatus(null);
    try {
      const response = await fetch("/api/email-verification", { method: "POST" });
      const data = await response.json().catch(() => null);
      setResendStatus(
        response.ok ? "Te reenviamos el enlace. Revisa tu correo." : (data?.error ?? "No se pudo reenviar."),
      );
    } finally {
      setIsResending(false);
    }
  }

  const trialExpired = daysUntilTrialEnds !== null && daysUntilTrialEnds <= 0;
  const trialEndingSoon = daysUntilTrialEnds !== null && daysUntilTrialEnds > 0 && daysUntilTrialEnds <= 7;

  if (isPublished && !trialExpired && !trialEndingSoon && !isCalendarRevoked) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {!isPublished && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-warning-tint p-4 text-sm text-on-warning-tint">
          <span className="flex items-center gap-3">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            Tu sitio todavía no es visible. Verifica tu correo para publicarlo.
          </span>
          <div className="flex items-center gap-3">
            {resendStatus && <span className="text-xs">{resendStatus}</span>}
            <BrandButton size="sm" variant="outline" onClick={resendVerification} disabled={isResending}>
              {isResending ? "Enviando…" : "Reenviar correo"}
            </BrandButton>
          </div>
        </div>
      )}

      {(trialExpired || trialEndingSoon) && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-card p-4 text-sm",
            trialExpired ? "bg-destructive-tint text-destructive" : "bg-warning-tint text-on-warning-tint",
          )}
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          {trialExpired
            ? "Tu prueba venció y tu sitio se despublicó. Escríbenos para renovarla."
            : `Tu prueba vence en ${daysUntilTrialEnds} ${daysUntilTrialEnds === 1 ? "día" : "días"}.`}
        </div>
      )}

      {isCalendarRevoked && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-warning-tint p-4 text-sm text-on-warning-tint">
          <span className="flex items-center gap-3">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            Google dejó de darnos acceso a tu calendario. Tus reservas siguen funcionando, pero no se están agendando.
          </span>
          <BrandButton size="sm" variant="outline" onClick={() => (window.location.href = "/api/google-calendar/connect")}>
            Reconectar
          </BrandButton>
        </div>
      )}
    </div>
  );
}
