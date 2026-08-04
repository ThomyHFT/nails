# SPEC 15 — Preview en vivo de la portada en `/admin/marca`

**Estado:** Implemented
**Alcance:** reemplazar los dos recuadros de color y la lista de rótulos de `BrandPreview` por una maqueta real de la portada — hero con la variante elegida, secciones en el orden elegido, coloreada con el arquetipo y tipografiada con el par elegido — que se redibuja en vivo mientras el tenant mueve cada control en `MarcaForm`.

## 0. Por qué esto reabre el SPEC 14

El SPEC 14 (Implemented) dejó esto explícitamente fuera de alcance (§7): *"previsualización en vivo de la portada dentro del panel — el micrositio real está a un clic y siempre va a ser más fiel que una maqueta."* Esa razón seguía siendo válida el día que se escribió: para ver el resultado real bastaba con guardar y abrir `/[slug]` en otra pestaña.

Lo que cambió es que ahora el panel tiene más controles que combinar antes de guardar — arquetipo, layout de hero, orden de secciones — y probar cada combinación abriendo una pestaña nueva y volviendo es la fricción que el tenant reportó. La preview no reemplaza al sitio real (sigue siendo la fuente de verdad, con datos reales), reemplaza al ensayo-y-error de guardar para ver.

## 1. Decisiones de diseño

### 1.1 La preview reutiliza los componentes de marca reales, no los reinventa

`/estilo` ya prueba que esto es viable: su sección "Vitrina pública" arma una portada completa con `Hero`, `Band`, `ServiceCard`, `GalleryGrid`/`MediaFrame`, `ReviewCard`, con datos de mentira, dentro de un contenedor que aplica los tokens del arquetipo elegido vía variables CSS. La preview de `/admin/marca` hace lo mismo, a escala menor: mismos componentes de `src/components/brand`, datos placeholder fijos (no llamados a la API), y el theming ya resuelto por `resolveBrandTokens` — que es exactamente lo que `BrandPreview` ya calcula hoy, solo que hoy lo aplica a un recuadro de mentira en vez de a la composición real.

Esto es deliberado: si mañana se agrega una sección nueva o un archetype nuevo, la preview no se desincroniza porque no tiene su propia copia de la UI — arma la misma portada con los mismos bloques.

### 1.2 Datos placeholder fijos, no el negocio real del tenant

La preview no llama a `/api/branding` con datos reales del tenant (nombre, servicios, portafolio, reseñas): usa un set fijo de datos de mentira, igual que `/estilo`. Tres razones:

- **Velocidad**: reacciona a cada click sin esperar una red.
- **Nunca vacía**: un tenant nuevo sin servicios ni portafolio vería una preview con huecos que no ayudan a decidir el layout — con datos de mentira, la preview siempre muestra las cuatro secciones con contenido, así se pueda razonar sobre el orden real.
- **Consistencia con `/estilo`**: mismo patrón ya validado, mismo texto de referencia ("Manicure Rosa", "Karla Nails Studio", etc. — o su versión neutra, ver 1.4).

La sección "Secciones sin contenido no se renderizan" (SPEC 14, criterio 6) sigue aplicando en el sitio real; en la preview, como los datos placeholder siempre tienen contenido, las cuatro secciones son visibles cuando están en el `sectionOrder` — la preview muestra qué pasaría si el tenant tuviera contenido en todas, no si hoy lo tiene.

### 1.3 Se actualiza en cada cambio de estado del formulario, no al guardar

`MarcaForm` ya mantiene `form` en estado de React y ya deriva `pendingBranding`/`resolved` de ese estado con `useMemo` (para los dos recuadros de `BrandPreview` actuales). La preview nueva se deriva del mismo `form` con el mismo patrón: cualquier cambio (arquetipo, color override, fuente, hero layout, check/flecha de sección) recalcula `resolved` y `sectionOrder` en el próximo render, sin submit y sin red.

### 1.4 Copy neutro, no el texto de "Karla Nails Studio"

A diferencia de `/estilo` (que es una referencia de diseño fija para un salón de uñas), esta preview vive dentro del panel de *cualquier* rubro. Usa el nombre real del tenant (`professional.businessName`, ya disponible via el layout de `/admin`) para el hero y placeholders neutros para el resto ("Servicio destacado", "Reseña de ejemplo", fotos de relleno con `MediaFrame` sin `src`) — no texto ni nombres que asuman uñas.

### 1.5 Claro/oscuro: uno de los dos, con el switch que ya existe en `/estilo`

`BrandPreview` hoy muestra claro y oscuro lado a lado porque son recuadros chicos — cómodo comparar. La maqueta completa no cabe dos veces sin scroll excesivo. Se muestra un modo a la vez con un `SegmentedControl` "Claro | Oscuro" encima de la preview (mismo patrón que `/estilo`), sin persistir la elección — vuelve a claro cada vez que se entra a `/admin/marca`.

### 1.6 Dónde vive en el layout

`MarcaForm` es hoy `grid gap-8 lg:grid-cols-2`: formulario a la izquierda, columna de preview a la derecha. La preview nueva reemplaza el contenido de esa columna derecha (los dos `BrandPreview` y la lista de rótulos de orden desaparecen). En pantallas angostas (`< lg`), la columna de preview cae debajo del formulario, como ya pasa hoy — no se agrega ningún mecanismo de sticky/scroll-spy nuevo.

### 1.7 De paso: los `<select>` nativos del admin pasan a un componente con estilo de marca

Menor y sin relación con la preview, pero se aprovecha el paso por `MarcaForm`: el `<select>` de par tipográfico (línea 333 de `MarcaForm.tsx`) y el de servicio asociado en `PortafolioManager.tsx` son elementos nativos del navegador con un `className` ad hoc cada uno — ni siquiera comparten el mismo borde (`border-input` vs `border-outline-variant`). El desplegable abierto usa el chrome del sistema operativo, no los tokens del tenant: es el único control del panel que no se puede teñir.

Se agrega el `Select` de shadcn/ui (`npx shadcn add select`, wrapper sobre `@base-ui/react/select`) en `src/components/ui/select.tsx`, mismo criterio que ya rige `Button`/`Input`/`Label`: shadcn para los formularios densos del admin. A diferencia del `<select>` nativo, el popup es HTML/CSS propio — hereda los tokens (`--radius`, `--border`, `--popover`) igual que el resto del panel. Los dos usos nativos encontrados se migran a este componente.

## 2. Dominio y aplicación

Sin cambios. No hay esquema, endpoint ni caso de uso nuevo — esto es composición de UI sobre datos que `MarcaForm` ya calcula (`resolved`, `form.heroLayout`, `form.sectionRows`).

## 3. UI

### 3.1 Nuevo componente `PortadaPreview`

`src/app/[slug]/admin/marca/PortadaPreview.tsx`, client component. Props:

```
{
  businessName: string;
  tokens: BrandTokenSet;
  fontPair: BrandFontPair;
  heroLayout: HeroLayout;
  sections: PortadaSection[];   // ya filtradas a las incluidas, en orden
  logoUrl: string | null;
  coverImageUrl: string | null;
}
```

Arma, dentro de un contenedor con los tokens aplicados como variables CSS (mismo cálculo que `tokensStyle` de `BrandPreview`, movido a un helper compartido en vez de duplicado):

- `Hero` con `layout={heroLayout}`, título = `businessName`, `imageUrl = coverImageUrl` (o `undefined` si no hay portada cargada, igual que hace hoy la portada real).
- Por cada `section` en `sections`, el bloque correspondiente con datos placeholder:
  - `servicios`: dos `ServiceCard` de mentira.
  - `galeria`: `GalleryGrid` con 4 `MediaFrame` sin `src` (o con `coverImageUrl` repetida si no hay portafolio propio que mostrar).
  - `opiniones`: dos `ReviewCard` de mentira con `authorName: "Cliente"`.
  - `contacto`: un `ContactCard` de ejemplo.

Escala: la preview corre a ancho de columna (no ancho completo de viewport), con `text-[0.9em]`/contenedor `max-w` acotado — no hace falta recalcular breakpoints, los componentes de marca ya son responsivos y se ven bien angostos.

### 3.2 `MarcaForm.tsx`

- Se borra `BrandPreview` de la columna derecha (el archivo `BrandPreview.tsx` se elimina si no lo usa nadie más — confirmar con un grep antes de borrar).
- Se agrega `PortadaPreview` con un `SegmentedControl` claro/oscuro encima, alimentado por `resolved.light`/`resolved.dark` según el modo elegido.
- El bloque "Orden de la portada" (la lista de rótulos que hoy vive debajo de `BrandPreview`) se borra: la preview real ya muestra el orden, listarlo en texto aparte queda redundante.
- El `<select>` de par tipográfico (§1.7) pasa al nuevo `Select` de shadcn/ui.

### 3.3 `PortafolioManager.tsx`

El `<select>` de servicio asociado (§1.7) pasa al mismo `Select` de shadcn/ui. Sin cambios de comportamiento — mismas opciones, mismo `onChange`.

## 4. Criterios de aceptación

1. Cambiar el arquetipo en el formulario recolorea la preview completa (hero, bandas, tarjetas, pie) sin submit y sin recargar.
2. Cambiar el layout de hero (`split`/`stacked`/`minimal`) cambia la composición del hero en la preview al instante.
3. Desmarcar "Opiniones" en la lista de secciones la saca de la preview; subirla con la flecha la mueve arriba en la preview.
4. Elegir un par tipográfico cambia la familia del titular en la preview.
5. El switch claro/oscuro de la preview no afecta el resto del formulario ni se guarda.
6. Un tenant nuevo (sin servicios, portafolio ni reseñas reales) ve las cuatro secciones con contenido de mentira en la preview — no huecos vacíos.
7. La preview usa el nombre real del negocio en el hero, y copy neutro en las secciones de relleno.
8. En pantallas angostas la preview sigue siendo legible (cae debajo del formulario, no se corta ni desborda horizontalmente).
9. Los dos `<select>` migrados (par tipográfico, servicio asociado) se ven y comportan igual entre sí, con el radio y los colores del tenant — no el desplegable por defecto del navegador.

## 5. Fuera de alcance

Datos reales del tenant en la preview (servicios, portafolio, reseñas propias) — eso ya lo resuelve abrir `/[slug]` en otra pestaña, y es lo que se sigue recomendando para el chequeo final antes de publicar. Edición inline sobre la preview (arrastrar secciones directamente en la maqueta en vez de en la lista con flechas — la lista ya es la SPEC 14 §1.4, no se toca acá). Preview de `/admin/marca` en un iframe apuntando al sitio real con parámetros de query — se evaluó y se descartó por ser más lento (round-trip a la API) y más frágil (depende de que el sitio real interprete parámetros que no persistió) que una maqueta local con los mismos componentes.
