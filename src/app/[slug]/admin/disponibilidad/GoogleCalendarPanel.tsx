"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/brand/surface";
import { Body, Caption, Title } from "@/components/brand/typography";

interface ConnectionStatus {
  configured: boolean;
  connection: { googleAccountEmail: string; status: "active" | "revoked"; connectedAt: string } | null;
}

function readSyncResultFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const outcome = params.get("google_calendar");
  if (!outcome) return null;

  const messages: Record<string, string> = {
    connected: params.has("synced")
      ? `Conectado. Subimos ${params.get("synced")} de ${params.get("attempted")} reservas próximas a tu calendario.`
      : "Conectado.",
    state_mismatch: "No pudimos verificar la conexión. Intenta de nuevo.",
    not_configured: "Google Calendar no está configurado.",
    error: "No se pudo conectar con Google. Intenta de nuevo.",
    no_refresh_token: "Google no nos dio permiso permanente. Intenta de nuevo y acepta todos los pasos.",
  };

  return messages[outcome] ?? null;
}

export function GoogleCalendarPanel() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [oneTimeMessage] = useState<string | null>(() =>
    typeof window === "undefined" ? null : readSyncResultFromUrl(),
  );
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    if (window.location.search.includes("google_calendar")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    fetch("/api/google-calendar/status")
      .then((res) => res.json())
      .then(setStatus);
  }, []);

  async function disconnect() {
    if (isDisconnecting) return;
    if (!window.confirm("¿Desconectar Google Calendar? Los eventos que ya creamos en tu calendario se quedan donde están.")) {
      return;
    }
    setIsDisconnecting(true);
    try {
      await fetch("/api/google-calendar/disconnect", { method: "POST" });
      const response = await fetch("/api/google-calendar/status");
      setStatus(await response.json());
    } finally {
      setIsDisconnecting(false);
    }
  }

  if (!status || !status.configured) return null;

  return (
    <Panel className="flex flex-col gap-3">
      <Title>Google Calendar</Title>
      {oneTimeMessage && <Body className="text-sm">{oneTimeMessage}</Body>}

      {status.connection ? (
        <>
          <Body className="text-sm">
            Conectado como <strong>{status.connection.googleAccountEmail}</strong>
          </Body>
          <Caption>
            Desde {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(new Date(status.connection.connectedAt))}
          </Caption>
          <Button variant="outline" size="sm" className="w-fit" onClick={disconnect} disabled={isDisconnecting}>
            {isDisconnecting ? "Desconectando…" : "Desconectar"}
          </Button>
        </>
      ) : (
        <>
          <Body className="text-sm">Espeja tus reservas confirmadas en tu calendario de Google.</Body>
          <Button
            size="sm"
            className="w-fit"
            onClick={() => {
              window.location.href = "/api/google-calendar/connect";
            }}
          >
            Conectar Google Calendar
          </Button>
        </>
      )}
    </Panel>
  );
}
