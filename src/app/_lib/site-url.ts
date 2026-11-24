import { env } from "@/server/infrastructure/config/env";

/** URL pública de la app, sin `/` final: arma los enlaces que viajan por WhatsApp o correo. */
export function siteUrl(): string {
  return env.AUTH_URL.replace(/\/$/, "");
}
