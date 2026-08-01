/**
 * Imágenes de relleno para la página de referencia.
 *
 * Son SVG en data-URI generados desde los propios tokens del arquetipo, no
 * fotos: la referencia tiene que poder verse sin red, sin assets versionados y
 * sin que una foto bonita disimule un contraste malo.
 */
export function gradientPlaceholder(from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
