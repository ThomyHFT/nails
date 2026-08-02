# SPEC 09 — Pulido estético

**Estado:** Draft
**Alcance:** revisión visual sección por sección de todo el front-end público y del panel. No cambia dominio, esquema ni casos de uso: solo composición, tokens y microdetalle.

Método: se levantó el dev server con el tenant `karla` y se recorrió la app renderizada en escritorio (1280px) y móvil (390px), contrastando lo visto con el código de `src/components/brand` y `src/app`.

---

## 0. Sistema — cosas que afectan a todas las pantallas

### 0.1 El `body` es blanco, la marca no
`:root` deja `--background` en blanco y el color del tenant vive en `[data-tenant]`, que es un `div` interno. En la práctica el rebote de scroll de iOS, el área bajo el contenido corto y el `overscroll` muestran blanco puro contra el crema del tenant.

- Propagar los tokens del tenant a `html`/`body` (o pintar `body` con `background: inherit` desde el div de marca).
- Agregar `<meta name="theme-color">` derivado de `--background` para que la barra del navegador en móvil no corte el crema con blanco o gris de Chrome.

### 0.2 El modo oscuro está escrito pero no llega
`resolveBrandTokens` emite variante oscura bajo `prefers-color-scheme`, pero `.dark` (la clase que usan las primitivas de shadcn) nunca se aplica al `html`. Resultado: un usuario con el sistema en oscuro ve tokens oscuros del tenant y controles shadcn claros en el admin. O se completa (clase `dark` sincronizada) o se desactiva la rama oscura hasta que se complete. Convivir a medias es peor que cualquiera de las dos.

### 0.3 Dos gramáticas de foco conviviendo
Hay tres tratamientos de foco repartidos: `ring-2 ring-ring ring-offset-2`, `ring-2 ring-ring/40` sin offset y `outline` nativo (el SVG del diseñador). Unificar en un solo token `--focus-ring` y una clase `.focus-brand` aplicada por las primitivas. En un producto de detalle, el halo de foco es parte de la marca.

### 0.4 Versalitas por todas partes
`t-label` (uppercase + tracking) se usa para: botones, overlines, chips de estado, links de acción, etiquetas de campo y precios "DESDE". En la landing hay hasta ocho bloques en versalitas simultáneos. Pierde el efecto de sello. Propuesta: restringir `t-label` a **overlines y estados**; botones y links de acción pasan a sentence case con peso 600. Es el cambio de una línea con más impacto visual de toda esta lista.

### 0.5 Ritmo vertical acumulado
`Section` trae `py-12 md:py-16` y las secciones se apilan, así que entre galería y opiniones quedan ~128px de aire mientras que entre hero y banda quedan ~40px. Falta una escala de espaciado de sección (`sm | md | lg`) y colapsar el padding entre secciones consecutivas del mismo nivel.

### 0.6 Piezas fuera del sistema
- `ImageUploader` usa `Button` de shadcn, `rounded-md`, `h-24 w-24` y `style={{border: ...}}` en crudo. Es la única pieza que la clienta ve en el diseñador y en la reseña, y se ve de otro producto. Debe pasar a `MediaFrame` + `BrandButton`, con estado de arrastre y barra de progreso.
- `admin/loading.tsx` esqueletea con `bg-muted` y `rounded-md`; el público usa `bg-surface-2` y `rounded-card`. Unificar en una primitiva `Skeleton`.
- Quedan los SVG por defecto de Next en `public/` (`next.svg`, `vercel.svg`, `window.svg`…) y el favicon es el de create-next-app.

### 0.7 Movimiento
Solo hay transiciones de hover. No hay entrada de contenido: la landing aparece de golpe. Propuesta mínima y barata: `@keyframes fade-up` de 240ms aplicado a las secciones con `animation-timeline: view()` donde exista soporte, y respetar `prefers-reduced-motion`.

---

## 1. Header (`AppHeader` / `TenantHeader`)

1. El nombre del estudio compite con el logo circular a la misma altura y en el mismo azul. Bajar el nombre a `--foreground` y dejar el color de marca solo para el estado activo del nav.
2. El nav de escritorio marca el activo con un `border-b` de 1px pegado al texto. Un subrayado de 2px con `border-radius` y offset de 6px se lee mucho mejor y aguanta las cuatro tipografías.
3. El icono de cuenta es un `User` suelto sin ninguna afordancia; cuando hay sesión debería mostrar la inicial de la clienta en un círculo tonal. Es el único lugar donde el producto puede decir "te reconozco".
4. Falta el CTA "Reservar" en el header de escritorio. Hoy, si la clienta scrollea más allá del hero, no hay ninguna forma de reservar hasta el pie.
5. `backdrop-blur-md` con `bg-background/85`: en fondos crema el blur casi no se percibe y sí cuesta rendimiento en móvil. Con una hairline y opacidad 0.92 basta.

## 2. Hero

Es la sección con más problemas de la app.

1. **El eyebrow repite el nombre del negocio** que ya está en el header, a 60px de distancia. Cuando hay `tagline`, el eyebrow debería ser el Instagram, la comuna o "Manicurista independiente", nunca el mismo string.
2. **En escritorio el hero mide 905px de alto.** La imagen `portrait` a media pantalla (≈640×800) empuja todo y deja el bloque de texto flotando en un mar de crema con ~300px muertos arriba. Propuesta: `max-height` al marco (≈520px) o pasar a `ratio="wide"` con `md:aspect-[4/5]` acotado, y alinear el texto a `items-center` real contra una imagen del mismo alto.
3. **En móvil la foto va después del CTA**, o sea bajo el pliegue. En un producto de artesanía visual, el trabajo tiene que ser lo primero. Invertir el orden en móvil (`order-first`).
4. **El `FloatingStat` no aparece nunca** en escritorio salvo con reseñas, y en móvil está oculto por `hidden md:block`. La prueba social se pierde justo donde más pesa. Mostrarlo también en móvil, apoyado en la esquina inferior de la foto.
5. La foto de portada se recorta con `object-cover` centrado, y en este tenant corta un texto del local por el borde izquierdo. Falta un control de `object-position` en `MediaFrame` (y exponerlo en el admin de marca como "punto focal de la portada").
6. Sin `secondaryAction` (tenant sin teléfono) el CTA primario queda solo y a ancho completo en móvil, correcto, pero en escritorio queda un botón de 250px perdido en la columna. Fijar un ancho mínimo/máximo coherente.

## 3. Banda "Servicios destacados"

1. **Las tarjetas sin descripción colapsan.** Con los datos reales del tenant, `ServiceCard` variante `compact` queda: título + chip, hairline, duración + "RESERVAR". Un rectángulo con dos filas y aire raro al medio. Hay que dar altura mínima al cuerpo o, mejor, usar la variante `media` con la foto del servicio: existe, está terminada y no se usa en ninguna parte.
2. **El precio va en `Chip tone="neutral"`**, o sea `text-muted-foreground` sobre `surface-3`. El precio es el dato que más se mira y hoy se ve gris apagado, como una etiqueta deshabilitada. Debe ir en `--foreground` con peso 600, o en `primary-tint`.
3. **Tres servicios en grilla de 2 columnas** dejan la tercera tarjeta huérfana a media pantalla. Elegir grilla según cantidad (1→1 col, 2→2, 3→3, 4→2×2) o centrar la última fila.
4. La banda arranca a 40px del header pegajoso; con `rounded-band` de 2rem, el borde superior redondeado queda mordido por el header al scrollear. Sumar `scroll-margin-top` y aire superior.
5. "Ver todos los servicios" es un botón outline centrado; el sistema ya tiene `ActionLink` con flecha para exactamente esto. Dos tratamientos distintos para el mismo gesto en la misma página.

## 4. Portafolio ("Nuestro trabajo")

1. **`GalleryGrid` es rígido a 4 columnas.** Con dos fotos publicadas, el tenant real muestra dos imágenes a la izquierda y media pantalla vacía a la derecha. Es el defecto visual más caro de la landing. La grilla tiene que adaptarse al conteo (`grid-cols-2` con 2 items, `3` con 3, `4` con 4+).
2. Todas las fotos son `aspect-square`. Un portafolio de uñas se ve mucho mejor en mosaico de alturas mixtas (masonry con `grid-auto-rows` o el primer item destacado a 2×2).
3. No hay lightbox ni ampliación: la foto es el producto y no se puede mirar de cerca. Un `dialog` nativo con la imagen a pantalla completa y navegación con flechas es media tarde de trabajo.
4. El link "Ver más" hacia Instagram está en `hidden sm:inline-flex` — desaparece justo en móvil, que es donde Instagram importa.
5. Falta el pie de foto opcional (servicio y largo usados), que es contenido que la profesional ya tiene cargado.

## 5. Opiniones en la landing

1. `md:grid-cols-3` con dos reseñas deja columna vacía. Mismo arreglo que la galería.
2. Las tarjetas no muestran fecha en la landing (sí en `/opiniones`). Una reseña sin fecha vale menos.
3. La estrella llena usa `--accent` (dorado) y la vacía `--outline-variant` (rosado). Los dos tonos no pertenecen a la misma escala y la mezcla se ve accidental. La vacía debería ser el mismo `accent` al 25% o un gris neutro.
4. Falta avatar/inicial de la clienta. Con solo "Camila R." repetido dos veces, la sección parece de relleno.
5. `RatingSummary` va alineado a la derecha del titular en escritorio y debajo en móvil, sin jerarquía: el "4,5" merece ser una cifra grande, no texto corrido.

## 6. Contacto y pie de sitio

1. `ContactCard` solo aparece si el tenant tiene teléfono. Cuando no lo tiene —el caso actual— la landing termina de golpe en las reseñas. Debería haber un cierre alternativo (CTA de reserva a ancho completo sobre banda tonal).
2. **El pie es una franja gris de 91px** con tres elementos en `justify-between`: nombre a la izquierda, copyright al centro, links a la derecha. La lectura queda plana y el copyright centrado es lo que más pesa visualmente. Propuesta: pie de tres columnas reales (marca + tagline · navegación · contacto/redes), fondo `surface-2` en vez de `surface-4` (hoy el gris se despega del crema y parece de otro sitio), y una firma discreta "Hecho con Misuñas".
3. En móvil el pie se apila centrado y queda un bloque gris de 340px justo encima de la barra inferior: dos barras de sistema pegadas. Comprimir.

## 7. Catálogo `/servicios`

1. **Cero imágenes.** El catálogo de un oficio visual es hoy una lista de precios. Los servicios ya tienen `imageUrl` (SPEC 05). Debe mostrarse.
2. "DESDE $12.000" en el encabezado y "Corta · 45 min — $12.000" en la primera fila dicen lo mismo dos veces. Cuando se listan las variantes, sobra el "desde".
3. Las filas de variante no están en grilla: `Corta`/`Media`/`Larga` tienen anchos distintos, así que el "· 45 min" baila entre filas. Debe ser `grid-cols-[auto_1fr_auto]` con la duración alineada.
4. Las filas no tienen separador ni chevron; son enlaces pero no lo parecen. Una hairline entre filas y un `>` a la derecha resuelven la afordancia.
5. El botón "Reservar" outline `size="sm"` al final de cada tarjeta queda flotando a la izquierda con mucho aire abajo. O va a ancho completo, o desaparece (las filas ya enlazan).
6. Falta agrupar/filtrar cuando haya más de ~6 servicios, y falta el chip de duración estimada total.

## 8. Reserva — paso 1 (servicio y largo)

1. **El estado seleccionado es más débil que el no seleccionado.** `bg-primary-tint` sobre crema da un gris azulado que se lee como deshabilitado. La tarjeta elegida necesita borde de 2px en `primary`, tick visible y elevación.
2. **"Días con cupo este mes" arranca vacío.** `loadDaysWithSlots` solo se llama al cambiar de servicio o largo, nunca al montar; la primera vista dice "No hay días con cupo este mes todavía" aunque sí los haya. Es un error de estado con consecuencia estética directa (la primera impresión del flujo es "no hay hora").
3. Los chips de día son `Chip` estáticos, no seleccionables: la clienta ve "5 sep, 6 sep, 9 sep" y no puede tocarlos, y dos pasos después tiene que escribir la fecha en un `input[type=date]`. Deberían ser el selector de fecha.
4. La barra inferior de navegación del sitio sigue visible durante todo el flujo de reserva y compite con el CTA "Continuar". Un flujo de compra se hace en modo foco: sin bottom nav, con "salir" arriba.
5. "SERVICIO" en el indicador de pasos y "ELIGE TU SERVICIO" como overline, uno debajo del otro. El comentario del código ya advierte el problema para otro rótulo; acá sigue.
6. El chip de largo mete tres datos separados por punto medio (`Corta · $12.000 · 45 min`) y en móvil ocupa casi todo el ancho. Mejor tarjeta de largo con jerarquía (nombre grande, precio, duración en caption).

## 9. Diseñador de uñas

Es la pieza diferenciadora del producto y hoy es la más cruda.

1. Las uñas son elipses de color plano sobre rectángulos redondeados. Ni brillo, ni sombra, ni forma real. La **forma elegida (almendra, ataúd, stiletto) no se refleja en la mano**: se elige arriba y el dibujo no cambia. Es la incoherencia más grande de la app. La `rx/ry` de la elipse debe derivar de `SHAPES`.
2. El acabado (brillante/mate) tampoco se ve. Un `radialGradient` de brillo y una capa de opacidad para mate resuelven ambos.
3. Las decoraciones no se dibujan en absoluto: se eligen como chips y la mano no cambia. Aunque sea un punto/estrella simbólico, hay que representarlas.
4. El `Swatch` seleccionado usa `Check` con `mix-blend-difference`, que sobre colores medios da un gris ilegible. Mejor calcular contraste y elegir tick blanco o negro.
5. La cotización ("Extra por diseño +$X") aparece al fondo de un scroll largo; debería vivir en una barra pegajosa igual que en el paso final, actualizándose mientras se pinta.
6. No hay "deshacer", ni "limpiar todo", ni presets ("francesita", "un solo color"). Pintar 10 uñas a mano toque por toque es el camino largo y hoy es el único.
7. "Aplicar a todas" es un `BrandButton ghost size=sm` perdido en la esquina de un panel; es la acción más útil de la pantalla.
8. Faltan estados de carga del catálogo (`fetch` sin `loading`): al entrar, las secciones de color y acabado aparecen vacías y luego saltan.

## 10. Reserva — paso fecha y hora

1. `input[type=date]` nativo. Rompe la tipografía, el alto y el idioma según navegador, y es el control más feo de toda la app. Debe ser un calendario propio con los días sin cupo apagados — la data ya existe (`/api/availability/days`).
2. Los horarios son chips en `flex-wrap` sin agrupar. Agrupar por mañana/tarde con overline y alinearlos en grilla de 3–4 columnas.
3. `StickyActionBar` muestra el total y el botón, pero el total arranca en `$0` antes de elegir hora, lo que se lee como error. Mostrar el precio del servicio desde el principio.
4. "Casi listo, elige la hora." es la única cabecera con punto final del producto. Detalle de copy, pero se nota.
5. El bloque de resumen aparece de golpe bajo los horarios; merece transición y un ancla de scroll.

## 11. `/cuenta`

1. **"CERRAR SESIÓN" es la tercera línea de la página**, en versalitas azules, con el mismo peso que un encabezado de sección. Es una acción de servicio y está compitiendo con el título. Debe vivir en el menú del icono de cuenta del header, o al final de la página en tono discreto.
2. El estado vacío usa borde punteado, que en toda la web significa "arrastra un archivo aquí". Para "todavía no tienes reservas" corresponde borde sólido o solo superficie tonal.
3. La cabecera solo muestra el email. Con el nombre de la clienta y un saludo ("Hola, Camila") la pantalla deja de ser una tabla.
4. Las tarjetas de reserva no muestran la foto del diseño ni el diseño elegido, aunque la clienta lo configuró y está guardado. Es lo que ella querría volver a ver.
5. No hay separación entre próximas y pasadas: todo va en una lista plana ordenada por fecha.

## 12. Autenticación (login, registro, recuperar)

1. **`AuthCard` no se centra.** Tiene `flex-1 justify-center`, pero su padre (`main`) no es flex, así que el `flex-1` no hace nada: el formulario queda pegado arriba y debajo hay 400px de vacío antes del pie gris. Se ve roto. Arreglo: `main` con `flex flex-col`, o centrar con `min-h` propio.
2. Las tres pantallas no tienen ninguna marca: ni logo, ni foto, ni color. Son un formulario blanco. Con el logo del tenant arriba y una franja de portada al costado en escritorio, se vuelven parte del micrositio.
3. El campo de contraseña no tiene botón "ver". En móvil, sin él, la tasa de error sube.
4. `login` devuelve `null` mientras `status === "loading"`: la pantalla queda en blanco un instante. Debe esqueletear.
5. El error va como `Caption` en rojo suelto bajo los campos; debería ser un bloque con icono, como `InfoNote` tono destructivo.
6. En "Ya iniciaste sesión" la única acción es cerrar sesión. Falta el camino obvio: "Ir a mis reservas".

## 13. `/opiniones`

1. Grilla de 2 columnas con tarjetas de alto desigual: el borde inferior queda escalonado. `items-start` + masonry, o igualar alturas.
2. No hay filtro por nota ni orden; con 30 reseñas la página es un muro.
3. La foto de la reseña va acotada a `max-w-64` dentro de la tarjeta y queda descolgada a la izquierda. Debe ocupar el ancho de la tarjeta.
4. Falta la distribución de notas (5★ ▓▓▓▓ 12) junto al promedio. Es el gráfico que da credibilidad.

## 14. Estados de sistema

1. `loading.tsx` público esqueletea una grilla de 6 tarjetas siempre, sin importar la ruta: al entrar a `/servicios` aparece una grilla que no se parece a `/servicios`. Esqueletos por ruta.
2. `error.tsx` y `not-found.tsx` reutilizan `EmptyState` con icono gris: correcto en estructura, frío en tono. Merecen ilustración propia (una uña rota para el error, un frasco vacío para 404) en SVG monocromo con `currentColor`.
3. No hay `offline`, ni feedback de éxito tras reservar: la clienta confirma y aterriza en `/cuenta` sin ninguna confirmación visible. Falta la pantalla de "¡Listo!" con el resumen — es el momento más emocional del flujo y hoy es un redirect mudo.

## 15. Panel de la profesional

1. **Dos sistemas de formulario conviviendo.** `servicios`, `disponibilidad`, `diseno`, `marca` y `portafolio` usan `Input`/`Button` de shadcn; el resto usa las primitivas de marca. En una misma pantalla del admin hay botones de 32px grises junto a botones de 44px de marca.
2. El `AdminSidebar` marca el activo con `bg-surface-3 text-primary`, un gris casi idéntico al hover. Necesita más contraste (píldora `primary-tint` + peso 600).
3. `StatCard` muestra la cifra pero nunca la variación; el `hint` se usa solo a veces. Sin comparación, "Ingresos 7 días: $85.000" no dice nada.
4. El resumen del día no tiene línea de tiempo: son tarjetas sueltas. Una columna horaria con las citas ubicadas se lee de un vistazo, que es exactamente lo que la profesional necesita entre clienta y clienta.
5. `AdminAside` está definido en el sistema y no se usa en ninguna página.
6. En móvil el admin es una lista de páginas de escritorio comprimidas; el `AdminTopBar` solo muestra el nombre de la sección, sin acción principal.
7. `admin/error.tsx` usa `Button` de shadcn mientras el error público usa `BrandButton`.

---

## Prioridad sugerida

**Tanda 1 — se ve mal hoy, arreglo acotado**
0.4 versalitas · 2.1 eyebrow duplicado · 2.2 alto del hero · 3.1/3.2 tarjetas de servicio · 4.1 grilla del portafolio · 5.1 grilla de reseñas · 8.2 días con cupo vacíos · 12.1 AuthCard sin centrar · 11.1 cerrar sesión.

**Tanda 2 — sube el nivel del producto**
7.1 imágenes en el catálogo · 9.1–9.3 el diseñador refleja forma, acabado y decoración · 10.1 calendario propio · 14.3 pantalla de confirmación · 6.2 pie de sitio.

**Tanda 3 — coherencia y terminación**
0.1–0.3 · 0.6 piezas fuera del sistema · 15.1 unificar formularios del admin · 4.3 lightbox · 13.4 distribución de notas · 0.7 movimiento.
