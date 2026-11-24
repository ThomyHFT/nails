/**
 * Links cortos (SPEC 21): `/{slug}/r` lleva a reservar y `/{slug}/r/{código}`
 * a reservar un servicio. El código son los primeros 8 caracteres
 * hexadecimales del id: no hace falta guardarlo, y dentro de un negocio con
 * decenas de servicios una colisión es despreciable (32 bits).
 */
export const SHORT_CODE_LENGTH = 8;

export function serviceShortCode(serviceId: string): string {
  return serviceId.replace(/-/g, "").slice(0, SHORT_CODE_LENGTH).toLowerCase();
}

/** El servicio cuyo código coincide, o `null`. Si dos coinciden, ninguno: mejor la reserva sin servicio que el equivocado. */
export function resolveShortCode<T extends { id: string }>(code: string, services: T[]): T | null {
  const normalized = code.toLowerCase();
  if (!/^[0-9a-f]{8}$/.test(normalized)) return null;
  const matches = services.filter((service) => serviceShortCode(service.id) === normalized);
  return matches.length === 1 ? matches[0] : null;
}
