# SPEC 04 — Personalización de marca por tenant y rediseño visual

> **Estado:** Implemented
> **Depende de:** SPEC 01, SPEC 02, SPEC 03
> **Fecha:** 2026-07-31
> **Objetivo:** Permitir que cada profesional defina la identidad visual de su micrositio —arquetipo, color primario, tipografía, logo y portada— y rediseñar todas las pantallas de la app para que consuman esos tokens.

---

## Alcance

**Dentro:**

- Tabla nueva `tenant_branding`, relación 1:1 con `professionals`. Toda la identidad visual del tenant vive acá.
- Cuatro arquetipos visuales: `minimal_nude`, `glam`, `editorial`, `pastel_soft`. Cada uno define un set completo de tokens (color, tipografía, radios, sombras) en variante clara y oscura. Los tokens viven en código, no en la base; la base solo guarda cuál eligió la profesional.
- Color primario y color de texto sobre el primario, ambos elegidos por la profesional. Pisan lo que trae el arquetipo. Nulos significa "usar el del arquetipo".
- Par tipográfico elegido de una lista cerrada de cinco duplas heading/body, precargadas con `next/font`. La profesional no sube fuentes ni escribe nombres.
- `logo_url` y `cover_image_url` como texto validado (`https://`). La profesional pega una URL externa; no hay subida de archivos en este spec.
- Motor de theming: un layout nuevo en `src/app/[slug]/layout.tsx` que resuelve los tokens del tenant y los inyecta como variables CSS. Todo shadcn ya lee esas variables, así que el cambio se propaga sin tocar componentes uno por uno.
- Dark mode automático por `prefers-color-scheme` de la visitante. La profesional define ambas variantes al elegir arquetipo, no elige el modo.
- Página `/[slug]/admin/marca` con selector de arquetipo, color primario, color de texto, par tipográfico, logo y portada, más un preview en vivo que dibuja un mini-micrositio con los tokens pendientes.
- Rediseño visual de la landing pública `/[slug]`: hero con portada, logo, nombre y bio, CTA de reserva, bloque de contacto por WhatsApp (`professionals.phone`) y enlace a Instagram (`professionals.instagram_handle`).
- Contenedores de servicios destacados y portafolio en la landing, con render condicional: si no hay datos que mostrar, la sección no se renderiza. El spec del catálogo público solo tendrá que llenarlos.
- Barra de navegación inferior en el micrositio público con dos destinos: Inicio y Mis Reservas.
- Rediseño visual del flujo de reserva completo: selección de servicio y variante, días con cupo, diseñador de uñas, fecha y hora, y confirmación.
- Rediseño visual de las pantallas de sesión de la clienta: cuenta, login y registro.
- Rediseño visual del panel admin al layout de barra lateral más panel de resumen: dashboard de reservas, disponibilidad, catálogo de diseño y la página de marca nueva.
- El panel admin también se pinta con la marca del tenant, no con un tema fijo de plataforma.
- Tests con Vitest sobre la resolución de tokens (arquetipo más overrides), la validación de las URLs y del formato de color, y el caso de tenant sin fila de marca.

**Fuera de alcance (para specs futuros):**

- Subida y almacenamiento de imágenes. Sigue diferida desde el SPEC 03: logo y portada se cargan por URL. Cuando exista el spec de imágenes, solo se reemplaza el input por un botón de subida.
- Catálogo público de servicios, portafolio y reviews con contenido real. Este spec deja los contenedores; el contenido es del spec siguiente.
- Que la profesional fuerce el modo claro u oscuro de su micrositio. En este spec manda la preferencia del dispositivo de la visitante.
- Tipografías fuera de la lista curada, subida de fuentes propias o carga desde URL externa. Una fuente arbitraria es superficie de inyección y peso de bundle sin control.
- Dominio propio por tenant. El micrositio sigue viviendo en `/[slug]`.
- Editor visual libre: reordenar secciones, ocultar bloques, arrastrar y soltar. La profesional elige marca, no arma su página.
- Personalización de los textos de la aplicación. Los copys son de la plataforma y siguen en español de Chile.
- Favicon, imagen de Open Graph y metadatos por tenant. Se apoyan en el mismo logo, pero son su propia tanda de trabajo.
- Arquetipos que la profesional pueda crear o guardar como propios. Elige uno de los cuatro y lo ajusta con los overrides definidos.

---

## Modelo de datos

Una tabla nueva y dos enums nuevos. Ninguna tabla existente cambia de forma.

### Enum `brand_archetype`

| Valor          | Descripción                                        |
| -------------- | -------------------------------------------------- |
| `minimal_nude` | Terroso, sobrio, artesanal. Es el valor por defecto |
| `glam`         | Enérgico, alto contraste, dorados                   |
| `editorial`    | Monocromo, estructurado, esquinas rectas            |
| `pastel_soft`  | Suave, cercano, esquinas muy redondeadas            |

### Enum `brand_font_pair`

| Valor              | Heading            | Body              |
| ------------------ | ------------------ | ----------------- |
| `playfair_jakarta` | Playfair Display   | Plus Jakarta Sans |
| `cormorant_inter`  | Cormorant Garamond | Inter             |
| `dmserif_outfit`   | DM Serif Display   | Outfit            |
| `jakarta_solo`     | Plus Jakarta Sans  | Plus Jakarta Sans |
| `fraunces_nunito`  | Fraunces           | Nunito            |

### Tabla `tenant_branding`

| Columna                | Tipo                        | Nota                                                                    |
| ---------------------- | --------------------------- | ----------------------------------------------------------------------- |
| `id`                   | uuid, PK                    | `gen_random_uuid()`                                                     |
| `professional_id`      | uuid, not null, unique      | FK a `professionals`. El unique fuerza una sola fila de marca por tenant |
| `archetype`            | `brand_archetype`, not null | Por defecto `minimal_nude`                                              |
| `primary_color_hex`    | text, nulo                  | Formato `#RRGGBB`. Nulo significa usar el del arquetipo                  |
| `on_primary_color_hex` | text, nulo                  | Formato `#RRGGBB`. Color del texto sobre el primario                     |
| `font_pair`            | `brand_font_pair`, nulo     | Nulo significa usar el par del arquetipo                                 |
| `logo_url`             | text, nulo                  | Debe empezar con `https://`                                              |
| `cover_image_url`      | text, nulo                  | Debe empezar con `https://`                                              |
| `created_at`           | timestamptz, not null       | `defaultNow()`                                                          |
| `updated_at`           | timestamptz, not null       | `defaultNow()`                                                          |

Todos los campos de personalización son nulables y la regla es una sola: **nulo significa heredar del arquetipo.** Un tenant sin fila en `tenant_branding` se comporta igual que uno con la fila en valores por defecto, así que ninguna profesional queda con el micrositio roto por no haber entrado nunca a la pantalla de marca.

Las validaciones de formato (`#RRGGBB`, `https://`) viven en la capa de aplicación, no como `CHECK` en la base. Misma decisión que tomó el SPEC 03 con `design_elements.color_hex`, por la misma razón: son reglas de negocio y cambian más fácil en un caso de uso que en una migración.

### Tokens de arquetipo

Los tokens no se guardan en la base. Viven en código, en `src/server/domain/branding/brand-archetypes.ts`, como objetos TypeScript:

```ts
type BrandTokenSet = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  radius: string;
};

type BrandArchetypeDefinition = {
  label: string;
  defaultFontPair: BrandFontPair;
  light: BrandTokenSet;
  dark: BrandTokenSet;
};
```

El set de tokens es exactamente el que ya consume shadcn en `globals.css`. El `DESIGN.md` de la exportación define unos cincuenta tokens al estilo Material (`surface-container-high`, `on-tertiary-fixed-variant` y demás); esos se colapsan a este set de diecinueve. Lo que no tiene un token equivalente en shadcn no se implementa: agregar tokens propios obligaría a tocar cada componente a mano, que es justo lo que este diseño evita.

### Resolución de tokens

Función pura, sin acceso a base de datos:

```ts
type ResolvedBrand = {
  light: BrandTokenSet;
  dark: BrandTokenSet;
  fontPair: BrandFontPair;
  logoUrl: string | null;
  coverImageUrl: string | null;
};

function resolveBrandTokens(branding: TenantBranding | null): ResolvedBrand;
```

Reglas:

- `branding` nulo devuelve el arquetipo `minimal_nude` completo, sin overrides.
- `primary_color_hex` no nulo pisa `primary` en **ambas** variantes, clara y oscura.
- `on_primary_color_hex` no nulo pisa `primaryForeground` en ambas variantes.
- `font_pair` nulo cae al `defaultFontPair` del arquetipo.
- La función no valida contraste ni corrige colores. Recibe lo que la profesional guardó y lo devuelve tal cual.

---

## Plan de implementación

Cada paso deja el proyecto ejecutable y es commiteable por sí solo. Los pasos 1 a 10 construyen el motor de marca; del 11 en adelante es rediseño pantalla por pantalla.

1. **Migración de esquema.** Crear los enums `brand_archetype` y `brand_font_pair`, y la tabla `tenant_branding` con su unique sobre `professional_id`. Generar y aplicar la migración. Verificación: `db:studio` muestra la tabla nueva y rechaza dos filas con el mismo `professional_id`.

2. **Dominio: tipos y entidad.** Crear `src/server/domain/branding/brand-tokens.ts` con `BrandTokenSet`, `BrandArchetype`, `BrandFontPair` y `BrandArchetypeDefinition`; y `tenant-branding.entity.ts` con la entidad. Puro TypeScript, sin Drizzle ni Next.js. Verificación: `tsc --noEmit` limpio y nada importa `infrastructure/`.

3. **Dominio: los cuatro arquetipos.** Crear `brand-archetypes.ts` con las definiciones completas de `minimal_nude`, `glam`, `editorial` y `pastel_soft`, cada una con set claro y oscuro y su par tipográfico por defecto. Los valores de `minimal_nude` y `glam` salen del `DESIGN.md` exportado; `editorial` y `pastel_soft` se derivan de su descripción escrita. Verificación: un test recorre los cuatro arquetipos y comprueba que ninguna clave del set queda vacía en ninguna de las dos variantes.

4. **Dominio: resolución de tokens.** Crear `resolve-brand-tokens.ts` con la función pura que combina arquetipo y overrides. Verificación: tests cubren tenant sin fila de marca, override solo de primario, override de primario y texto, y `font_pair` nulo cayendo al del arquetipo.

5. **Dominio: puerto del repositorio.** Crear `branding-repository.port.ts` con `findByProfessionalId` y `upsert`. Verificación: compila sin depender de infraestructura.

6. **Repositorio de infraestructura.** Crear `src/server/infrastructure/repositories/drizzle-branding.repository.ts` implementando el puerto. El `upsert` usa `onConflictDoUpdate` sobre `professional_id`. Verificación: script manual crea la marca de un tenant, la vuelve a guardar con otro color y comprueba que sigue habiendo una sola fila.

7. **Caso de uso y validaciones.** Crear `src/server/application/branding/get-tenant-branding.use-case.ts` y `configure-tenant-branding.use-case.ts`. El segundo valida `#RRGGBB` en los dos colores y `https://` en las dos URLs, y rechaza valores fuera de los enums. Verificación: tests con repositorio fake cubren hex inválido, URL `http://`, URL sin esquema y arquetipo inexistente.

8. **Ruta de la API.** Crear `src/app/api/branding/route.ts` con `GET` y `PUT`, ambos detrás del guard de dueña del tenant, siguiendo el patrón de `design-elements/route.ts`. Verificación: `PUT` con hex inválido responde 400 sin escribir; una profesional no puede modificar la marca de otro tenant.

9. **Fuentes.** Declarar las ocho familias de los cinco pares con `next/font/google` en el layout raíz, exponiendo cada una como variable CSS. Verificación: las ocho variables existen en el HTML servido y ninguna fuente se descarga hasta que un par la usa.

10. **Motor de theming.** Crear `src/app/[slug]/layout.tsx`: resuelve el tenant por slug, lee su marca, llama a `resolveBrandTokens` e inyecta los tokens como variables CSS en un contenedor que envuelve todo el micrositio, incluyendo el bloque `@media (prefers-color-scheme: dark)` con el set oscuro. Verificación: dos tenants con arquetipos distintos se ven con paletas distintas en el navegador, sin haber tocado ni un componente; cambiar la preferencia del sistema alterna claro y oscuro.

11. **Página de marca en admin.** Crear `src/app/[slug]/admin/marca/page.tsx` con selector de arquetipo, selectores de color primario y de texto sobre primario, selector de par tipográfico, y campos de logo y portada. El preview en vivo dibuja un mini-micrositio (hero, botón primario, input y tarjeta) con los tokens pendientes, renderizado en sus **dos variantes lado a lado, clara y oscura**, para que la profesional vea el resultado en ambas antes de guardar. Verificación: la profesional cambia arquetipo y color, ve las dos variantes del preview actualizarse sin guardar, guarda, y su micrositio público refleja el cambio.

12. **Shell público y navegación.** Crear el header del micrositio (logo y nombre del negocio) y la barra de navegación inferior con Inicio y Mis Reservas, aplicados a todas las páginas públicas del tenant. Verificación: la barra aparece en landing, reserva y cuenta, y marca el destino activo.

13. **Rediseño de la landing.** Rehacer `src/app/[slug]/page.tsx` con hero de portada, logo, nombre y bio, CTA de reserva, bloque de WhatsApp y enlace a Instagram. Los contenedores de servicios y portafolio se renderizan solo si hay datos. Verificación: un tenant sin portada, sin logo, sin teléfono y sin Instagram renderiza una landing correcta y sin huecos.

14. **Rediseño del flujo de reserva, primera mitad.** Rehacer los pasos de servicio y variante, y la vista de días con cupo, dentro de `ReservarForm.tsx`. Verificación: el flujo sigue llegando al paso de diseño con la variante correcta seleccionada.

15. **Rediseño del diseñador de uñas.** Repintar `NailDesigner.tsx` con los tokens y el panel del diseño de Stitch. El SVG de las dos manos se conserva tal cual está. Verificación: las diez uñas siguen siendo clickeables con área de toque de 44 px, aplicar a todas sigue funcionando y la cotización en vivo sigue coincidiendo.

16. **Rediseño del flujo de reserva, segunda mitad.** Rehacer el paso de fecha y hora, y la pantalla de confirmación con el resumen del diseño, el precio total y el aviso de pago presencial. Verificación: una reserva con diseño y una sin diseño se completan de punta a punta.

17. **Rediseño de las pantallas de sesión.** Rehacer cuenta, login y registro con el design system. Verificación: registro, login, listado de reservas y cancelación siguen funcionando.

18. **Rediseño del shell del admin.** Rehacer `admin/layout.tsx` con la barra lateral de navegación y el panel derecho de resumen del día, y el dashboard de reservas con sus acciones. Verificación: confirmar, completar, marcar no-show y cancelar siguen funcionando desde el layout nuevo.

19. **Rediseño del resto del admin.** Rehacer las páginas de disponibilidad y de catálogo de diseño dentro del shell nuevo. Verificación: guardar reglas del mes, crear excepciones, y crear, editar y desactivar elementos del catálogo siguen funcionando.

20. **Tests.** Cerrar la cobertura sobre resolución de tokens, completitud de los cuatro arquetipos, validaciones de color y URL, y el caso de tenant sin fila de marca. Verificación: `npm test` pasa en verde.

21. **Deploy.** Aplicar la migración contra Neon y pushear. Verificación: dos tenants reales con arquetipos distintos se ven distintos en producción, y una clienta completa una reserva de punta a punta en el micrositio rediseñado.

---

## Criterios de aceptación

### Esquema

- [ ] `npm run db:migrate` aplica la tabla `tenant_branding` y los dos enums nuevos sin errores.
- [ ] Insertar dos filas de `tenant_branding` con el mismo `professional_id` es rechazado por la base de datos.
- [ ] Un tenant sin fila en `tenant_branding` renderiza su micrositio completo con el arquetipo `minimal_nude`, sin errores.

### Configuración de marca

- [ ] La profesional elige cada uno de los cuatro arquetipos desde `/admin/marca` y el valor queda guardado.
- [ ] Guardar un `primary_color_hex` que no cumple el formato `#RRGGBB` es rechazado con 400 y no escribe la fila.
- [ ] Guardar un `logo_url` que empieza con `http://` es rechazado con 400.
- [ ] Guardar un `logo_url` sin esquema es rechazado con 400.
- [ ] Elegir un par tipográfico cambia la fuente de los títulos y la del cuerpo en el micrositio público.
- [ ] Dejar el color primario vacío hace que el micrositio use el primario del arquetipo.
- [ ] El preview en vivo refleja el color y el arquetipo elegidos antes de guardar.
- [ ] Guardar la marca del mismo tenant dos veces deja una sola fila en `tenant_branding`.
- [ ] Una profesional no puede leer ni modificar la marca de otro tenant.

### Motor de theming

- [ ] Dos tenants con arquetipos distintos se ven con paletas distintas, sin recargar la aplicación entre uno y otro.
- [ ] El color primario elegido aparece en los botones primarios de todas las pantallas públicas del tenant.
- [ ] El `on_primary_color_hex` elegido es el color del texto dentro de los botones primarios.
- [ ] El panel admin del tenant usa la misma paleta que su micrositio público.

### Dark mode

- [ ] Con `prefers-color-scheme: dark`, el micrositio usa el set oscuro del arquetipo.
- [ ] Con `prefers-color-scheme: light`, usa el set claro.
- [ ] El color primario personalizado se aplica en las dos variantes.
- [ ] Los cuatro arquetipos tienen los diecinueve tokens definidos en ambas variantes, sin ninguna clave vacía.

### Landing pública

- [ ] La landing muestra portada, logo, nombre del negocio y bio cuando esos datos existen.
- [ ] Un tenant sin logo, sin portada, sin teléfono y sin Instagram renderiza la landing sin secciones vacías ni imágenes rotas.
- [ ] El bloque de WhatsApp abre `wa.me` con el teléfono del tenant.
- [ ] El enlace de Instagram abre el perfil del handle del tenant.
- [ ] Los contenedores de servicios y portafolio no se renderizan mientras no haya datos que mostrar.

### Navegación

- [ ] La barra inferior aparece en landing, reserva y cuenta, con Inicio y Mis Reservas.
- [ ] La barra marca visualmente el destino activo.
- [ ] La barra no aparece en el panel admin.

### Regresión del flujo de reserva

- [ ] El flujo sigue siendo servicio → variante → días con cupo → diseño → fecha → hora → confirmar.
- [ ] Las diez uñas del diseñador siguen siendo clickeables con área de toque de 44 px en viewport mobile.
- [ ] El botón de aplicar a todas sigue copiando la configuración a las diez uñas.
- [ ] La cotización mostrada en el diseñador sigue coincidiendo con la que queda guardada en la reserva.
- [ ] Una reserva con diseño y una sin diseño se completan de punta a punta y quedan en `pending`.
- [ ] La confirmación muestra servicio, variante, resumen del diseño, precio total, fecha, hora y el aviso de pago presencial.

### Regresión de sesión y admin

- [ ] Registro, login, listado de reservas y cancelación siguen funcionando después del rediseño.
- [ ] Confirmar, completar, marcar no-show y cancelar siguen funcionando desde el admin rediseñado.
- [ ] Guardar reglas de disponibilidad, crear excepciones y editar el catálogo de diseño siguen funcionando.
- [ ] El panel admin muestra el resumen del día con las próximas citas.

### Tests

- [ ] `npm test` pasa en verde e incluye tests de resolución de tokens, completitud de los cuatro arquetipos, validación de color y de URL, y tenant sin fila de marca.

---

## Decisiones

### Alcance del spec

- **Sí:** theming y rediseño visual completo en un solo spec, con veintiún pasos. Decisión explícita tomada después de evaluar la alternativa.
- **No:** partirlo en dos specs (motor de marca primero, rediseño después). Habría dado dos entregas más chicas y deployables por separado, pero se prefirió una sola pasada sobre el rediseño para no quedar con dos estéticas conviviendo entre un spec y el otro.
- **Sí:** ordenar el plan para que el paso 10 sea deployable por sí solo. Es la mitigación del riesgo que introduce la decisión anterior: si la rama se corta antes del rediseño, igual queda un producto coherente con la marca ya funcionando.

### Modelo de personalización

- **Sí:** arquetipo como base, más color primario y color de texto sobre primario elegidos libremente. La profesional arranca de algo diseñado y ajusta lo que más identifica su marca.
- **No:** solo arquetipos cerrados, sin overrides. Imposible de arruinar, pero cuatro presets no alcanzan para que una profesional sienta que el micrositio es suyo.
- **No:** tokens totalmente libres. Máxima libertad y máxima probabilidad de micrositios ilegibles, más una superficie de validación que no se justifica.
- **Sí:** el color del texto sobre el primario lo elige la profesional a mano.
- **No:** calcularlo automáticamente por luminancia. Habría garantizado contraste siempre, pero le quita a la profesional el control sobre una decisión visual que sí le importa.
- **No:** validar y rechazar colores con contraste insuficiente. Habría bloqueado combinaciones que ella podría querer a propósito.
- **Sí:** el preview en vivo es la mitigación de haber dejado el contraste sin validar. Ve el resultado antes de guardar.

### Modelo de datos

- **Sí:** tabla nueva `tenant_branding`, con `professional_id` único.
- **No:** columnas de marca en `professionals`. Eran menos joins, pero mezcla identidad visual con datos de negocio en una tabla que ya tiene doce columnas.
- **Sí:** todos los campos de personalización nulables, con una sola regla: nulo significa heredar del arquetipo. Una regla mental en vez de un default distinto por campo.
- **Sí:** los tokens de los arquetipos viven en código, no en la base. Agregar un arquetipo es agregar un objeto TypeScript y corregir un color feo es un deploy, no una migración de datos sobre todas las filas.
- **No:** guardar los sets de tokens completos en la base. Habría permitido editarlos sin deploy, a cambio de miles de filas duplicadas y de que cada mejora de diseño requiera migrar datos.
- **Sí:** validar formato de color y de URL en la capa de aplicación. Misma decisión y misma razón que el SPEC 03 con `design_elements.color_hex`.
- **No:** un `CHECK` en la base para esos formatos.

### Motor de theming

- **Sí:** inyectar los tokens como variables CSS en un layout nuevo `src/app/[slug]/layout.tsx`. Todo shadcn ya lee esas variables, así que la marca se propaga a toda la aplicación sin editar componentes uno por uno.
- **No:** generar una clase o una configuración de Tailwind por arquetipo, que es como resolvió el HTML exportado de Stitch. Funciona para una maqueta estática, pero exige que los colores sean conocidos en tiempo de compilación, y acá el primario lo elige cada profesional en runtime.
- **Sí:** colapsar los cerca de cincuenta tokens del `DESIGN.md` a los diecinueve que ya consume shadcn. Es lo que hace viable el rediseño completo.
- **No:** implementar el set Material completo. Tokens sin componente que los lea son tokens muertos, y llenarlos obligaría a editar cada componente a mano.
- **Sí:** el panel admin también se pinta con la marca del tenant. Un solo motor para toda la aplicación y la herramienta se siente propia.
- **No:** admin con tema fijo de plataforma. Más simple de mantener visualmente, pero rompe la sensación de marca propia justo donde la profesional pasa más tiempo.

### Dark mode

- **Sí:** cada arquetipo define set claro y oscuro, y manda la preferencia del dispositivo de la visitante.
- **No:** que la profesional fuerce claro u oscuro. Es un campo más y una decisión más sobre algo que el sistema operativo de la clienta ya resolvió.
- **Sí:** los overrides de color pisan las dos variantes.
- **No:** pedir un color primario por modo. Habría dado mejor resultado visual en oscuro, a costa de duplicar la decisión para la profesional.

### Tipografía

- **Sí:** cinco pares heading/body cerrados, ya combinados.
- **No:** elegir heading y body por separado. Más combinaciones posibles, incluidas las que chocan.
- **No:** que la profesional suba una fuente o pegue la URL de una. Es superficie de inyección y peso de bundle sin control.
- **Sí:** declarar las ocho familias con `next/font` en el layout raíz. Es la única forma de que Next las optimice; la elección del tenant conmuta variables CSS, no carga fuentes en runtime.

### Imágenes

- **Sí:** `logo_url` y `cover_image_url` como texto validado con `https://`.
- **No:** resolver la subida de imágenes en este spec. Contradice lo decidido en el SPEC 03 y agrega infraestructura nueva a un spec que ya toca datos, theming, configuración y ocho pantallas.
- **No:** dejar logo y portada completamente fuera. La pantalla de marca habría quedado a medias y la landing sin hero real.

### Rediseño

- **Sí:** conservar el SVG de las dos manos en el diseñador de uñas, repintado con los tokens.
- **No:** adoptar la fila única de diez uñas que dibujó Stitch. Más simple, pero descarta trabajo hecho y contradice la decisión del SPEC 03 de que el dibujo anatómico es el diferenciador del producto.
- **Sí:** implementar los cuatro arquetipos del `DESIGN.md`, derivando `editorial` y `pastel_soft` de su descripción escrita.
- **No:** implementar solo los dos que Stitch dibujó. Habría dado dos arquetipos validados visualmente en vez de cuatro, pero agregar uno es agregar un objeto de tokens y el `DESIGN.md` ya los describe con suficiente detalle.
- **Sí:** barra de navegación inferior con dos destinos, Inicio y Mis Reservas.
- **No:** los tres del diseño, con Servicios apuntando al flujo de reserva. El catálogo público todavía no existe y la etiqueta sería engañosa.
- **Sí:** contenedores de servicios y portafolio con render condicional.
- **No:** dejarlos visibles y vacíos. Se ve como un sitio sin terminar.
- **Sí:** preview de marca como mockup estático que aplica los tokens pendientes.
- **No:** un iframe del micrositio real. Más fiel, pero obliga a pasarle tokens sin guardar y a recargar en cada cambio de color.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La profesional elige un color primario y un color de texto que juntos son ilegibles. El sistema no valida contraste por decisión explícita. | El preview en vivo muestra el resultado antes de guardar, con un botón de ejemplo usando los dos colores. El arquetipo sin overrides siempre es legible, así que vaciar el campo es la salida. |
| La rama vive veintiún pasos sin mergear y queda un estado híbrido entre el diseño viejo y el nuevo si se corta a la mitad. | El paso 10 deja la marca funcionando sobre las pantallas actuales y es deployable por sí solo. Del 11 en adelante el rediseño va de afuera hacia adentro: lo que ve la clienta se termina antes que lo que ve solo la profesional. |
| Repintar el flujo de reserva rompe funcionalidad que hoy anda. Es el riesgo más caro del spec: el diseñador y la cotización son el corazón del producto. | Casi la mitad de los criterios de aceptación son de regresión. Los cincuenta y dos tests existentes siguen corriendo en cada paso, y cada paso de rediseño se cierra recién cuando el flujo se completó de punta a punta en el navegador. |
| `editorial` y `pastel_soft` se derivan de una descripción escrita, sin pantalla de referencia. Pueden quedar visualmente pobres al lado de los dos que Stitch sí dibujó. | Un test verifica que ningún token quede vacío, y el paso 3 se cierra recién después de mirar los cuatro arquetipos aplicados sobre una pantalla real. Corregir un arquetipo es editar un objeto TypeScript, no migrar datos. |
| Un color primario elegido pensando en el fondo claro queda apagado o estridente sobre el fondo oscuro, porque los overrides pisan las dos variantes. | El preview muestra las dos variantes, clara y oscura, lado a lado. La profesional ve el resultado en ambas antes de guardar. |
| Con dark mode, cada arquetipo tiene dos sets de diecinueve tokens. Un token olvidado en la variante oscura significa texto invisible sobre su propio fondo. | El test de completitud recorre los cuatro arquetipos y las dos variantes y falla si alguna clave falta o queda vacía. |
| El logo y la portada son URLs externas. Pueden morir, ser lentas, o apuntar a contenido que la plataforma no controla. | La validación exige `https://`. El render es condicional y con fallback: si la imagen no carga, la landing se muestra sin ella en vez de dejar un ícono roto. El spec de subida de imágenes elimina el problema de raíz. |
| Las ocho familias tipográficas declaradas inflan el bundle si se cargan todas. | `next/font` solo emite las declaraciones `@font-face`; el navegador descarga únicamente la familia que el par activo usa. Se verifica en el paso 9 mirando las peticiones de red. |
| El layout del micrositio agrega una lectura de `tenant_branding` a cada request de cada página del tenant. | Es una consulta por slug sobre una tabla con índice único. Se resuelve una sola vez por render deduplicando la llamada, igual que ya se hace con la búsqueda de la profesional por slug. |
