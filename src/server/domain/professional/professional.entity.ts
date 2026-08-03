export interface Professional {
  id: string;
  slug: string;
  ownerUserId: string;
  businessName: string;
  bio: string | null;
  tagline: string | null;
  phone: string | null;
  phoneVisible: boolean;
  address: string | null;
  addressVisible: boolean;
  instagramHandle: string | null;
  timezone: string;
  active: boolean;
  /** `null` mientras no verifique el correo: hasta entonces el micrositio no es público. */
  publishedAt: Date | null;
  /** `null` = sin vencimiento (cuentas internas o ya pagadas). */
  trialEndsAt: Date | null;
  bufferMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Si el micrositio público del tenant es visible. Las tres condiciones son el
 * mismo interruptor visto desde tres momentos distintos: `active` es el corte
 * manual por abuso, `publishedAt` es la verificación de correo pendiente, y
 * `trialEndsAt` es el vencimiento de la prueba.
 *
 * Vive en el dominio y no repartido por las páginas para que no haya forma de
 * publicar un tenant por olvidarse de una de las tres.
 */
export function isPubliclyVisible(professional: Professional, now: Date = new Date()): boolean {
  if (!professional.active) return false;
  if (professional.publishedAt === null) return false;
  if (professional.trialEndsAt !== null && professional.trialEndsAt <= now) return false;
  return true;
}

/** El teléfono se muestra en el sitio público solo si existe y la profesional no lo ocultó. */
export function isPhoneVisible(professional: Professional): boolean {
  return professional.phone !== null && professional.phoneVisible;
}

/** La dirección se muestra en el sitio público solo si existe y la profesional no la ocultó. */
export function isAddressVisible(professional: Professional): boolean {
  return professional.address !== null && professional.addressVisible;
}
