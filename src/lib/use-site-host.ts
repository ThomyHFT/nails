"use client";

import { useSyncExternalStore } from "react";

function subscribe(): () => void {
  return () => {};
}

function getHost(): string {
  return window.location.host.replace(/^www\./, "");
}

function getServerHost(): null {
  return null;
}

/**
 * El dominio en el que está corriendo el sitio, sin `www.`, para mostrarle a la
 * profesional cómo va a quedar su dirección. Antes estaba escrito a mano
 * (`agendaunas.cl/...`) y no coincidía con el dominio real del deploy.
 *
 * Durante el render del servidor devuelve `null` (no hay `window`); React lo
 * reemplaza por el host real al hidratar, sin advertencia de desajuste.
 */
export function useSiteHost(): string | null {
  return useSyncExternalStore(subscribe, getHost, getServerHost);
}
