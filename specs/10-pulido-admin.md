# SPEC 10 — Pulido del panel de la profesional

**Estado:** Draft
**Alcance:** mismo ejercicio que el SPEC 09 pero del lado del admin (`src/app/[slug]/admin`). No cambia dominio, esquema ni casos de uso salvo que se indique lo contrario: solo composición, tokens y microdetalle.

Método: login real como `profesional@misunas.cl` en el tenant `karla`, recorrido de las 8 secciones en escritorio (1280px) y móvil (390px), contrastado contra el código.

---

## 0. Sistema — lo que se repite en varias pantallas

### 0.1 Dos productos en una sola app
`Resumen`, `Reservas` y `Opiniones` están hechas con el sistema de marca (`AdminPageHeader`, `Panel`, `Chip`, `EmptyState`, `BrandButton`). `Servicios`, `Catálogo de diseño` y `Portafolio` están armadas a mano con `Button`/`Input`/`select` nativo de shadcn y bloques `<div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>` que reinventan `Panel` sin serlo. El resultado: la clienta ve un producto con carácter (Stitch); la profesional, en la mitad de sus pantallas, ve un CRUD genérico. `Disponibilidad` y `Marca` quedan a medio camino — la mitad de cada una usa el sistema, la otra mitad no.

CLAUDE.md ya documenta la regla ("`Input`/`Button` de shadcn quedan para los formularios densos del admin"), pero acá no es densidad: es directamente no usar `Panel`, `AdminCard`, `AdminPageHeader` ni `BrandButton` donde sí corresponderían.

### 0.2 Botón de guardar sub-óptico
Los `Button` shadcn en variante `default` (guardar horario base, guardar en portafolio, guardar buffer, crear elemento) salen `bg-primary` a 32px con texto de 14px. Contra el primary pastel de este tenant (`#2f98bc`) se leen como deshabilitados. La acción más importante de cada formulario (guardar) es la que menos pesa visualmente.

### 0.3 Texto suelto como acción
"Activar" / "Desactivar" / "Eliminar" en Servicios y Catálogo de diseño son `Button variant="ghost" size="sm"`, que en la práctica son texto azul sin ningún fondo ni borde — se leen como links, no como controles de una fila de datos. No hay jerarquía entre "cambiar precio" (constante) y "eliminar" (destructivo, raro); ambos tienen el mismo peso visual.

### 0.4 Se rompe en 390px
Servicios y Catálogo de diseño arman cada fila con `flex items-center gap-3` sin `flex-wrap`. Con nombre + acciones + inputs en una sola línea, a 390px de ancho el contenido se corta a mitad de palabra ("Elimina|r", "Glitt|er") en vez de apilarse. Ocurre en las dos pantallas menos pulidas, consistente con que son las mismas que no usan el sistema de marca (que si maneja `flex-wrap` en todos lados).

### 0.5 Aviso hardcodeado fuera de paleta
`disponibilidad/page.tsx` tiene dos banners con `border-yellow-500/40 bg-yellow-500/10` en vez de `InfoNote tone="warning"` (que ya existe y ya usa `--warning`). Es el único lugar de todo el admin con un color que no sale de los tokens del tenant.

---

## 1. Navegación (`AdminSidebar` / `AdminTopBar`)

Ya revisada en el SPEC 09 (Tanda 3, activo con `bg-surface-3 text-primary`, contraste bajo con el hover). Sigue pendiente subir el contraste del ítem activo (píldora `primary-tint` + peso 600) — no se tocó en esa tanda, se toca acá.

## 2. Resumen del día

Bien resuelto: `StatCard`, `AppointmentRow`, `EmptyState` todo del sistema. Único hueco: la tarjeta "Próxima cita" con `—` cuando no hay citas queda un guion suelto sin contexto — un `EmptyState` inline o simplemente ocultar la tarjeta cuando `citas hoy === 0` sería más limpio que un guion.

## 3. Reservas

1. **El badge de estado muestra el enum crudo**, no una etiqueta. `reservas/page.tsx:137` renderiza `{booking.status}` directo — con `StatusBadge` aplicando versalitas, se lee "COMPLETED" / "CANCELLED" / "NO_SHOW" en inglés y con guion bajo, cuando `/cuenta` del lado público (`BOOKING_STATUS` map) ya resuelve exactamente este problema con "Pendiente", "Confirmada", etc. Es una regresión de consistencia entre las dos vistas de la misma reserva.
2. El chip de "N strikes" cuelga alineado a la derecha, debajo del badge de estado, sin relación visual clara con el nombre de la clienta al que aplica.
3. Sin filtro por estado ni buscador: con más de una veintena de reservas la página es scroll puro. No es urgente al volumen actual del seed, pero la agrupación por sección ya paga la mitad del camino — falta un ancla o un `select` para saltar a una sección.
4. El email de la clienta se muestra siempre en `Caption`, incluso cuando es larguísimo (se ve en el seed real): no trunca, puede desbordar la tarjeta en nombres largos.

## 4. Disponibilidad

1. **Los dos banners de "no cargaste el horario"** usan amarillo hardcodeado (`border-yellow-500/40 bg-yellow-500/10`) en vez de `InfoNote tone="warning"`. Es el único punto de toda la superficie del admin donde el color no sale de los tokens del tenant — en un tenant con primary saturado esto se nota como un parche ajeno.
2. **"Horario base semanal" es un `<details>` con checkboxes nativos** y `Input type="time"` sin ninguna envoltura — literalmente la única sección de esta página que no usa ni `Panel` ni `Label` con el peso visual del resto. Contrasta fuerte con el panel de detalle del día (`Panel`, `Title`, `Chip`, `Body`) treinta líneas más abajo, en la misma pantalla.
3. La leyenda de colores del calendario (Abierto/Extra/Bloqueado/Sin horario) existe y está bien pensada — no hace falta tocarla, solo señalar que si se toca el bloque de arriba conviene mantener la coherencia visual con esta parte de abajo, que sí está bien.
4. El toggle "Guardar horario base" no dice qué pasó tras guardar salvo un `<p>` de estado al final de toda la página, lejos del formulario que se acaba de tocar.

## 5. Servicios

1. **Ninguna tarjeta usa `Panel`**: cada servicio es una `<section>` con estilos en línea reconstruyendo lo que `Panel` ya resuelve. Cambiar a `Panel` es directo (incluso ya se ve casi idéntico visualmente) y elimina la duplicación.
2. **"Activar/Desactivar" y "Eliminar" son texto plano**, mismo tratamiento sea la acción reversible (desactivar) o irreversible (eliminar) — no hay ninguna distinción de color o peso entre ambas hasta que se confirma el eliminar.
3. **Precio y duración son dos `Input` sueltos sin etiqueta** ("$" o "min" no aparecen hasta después del campo de duración) — quien edita el precio no tiene ninguna pista de que está en pesos hasta leer el número.
4. **Se rompe en 390px**: la fila de nombre + acciones no envuelve, "Eliminar" queda cortado fuera de la pantalla. Mismo problema en la fila de variantes ("Corta [precio][duración] min Desactivar Eliminar" en una sola línea).
5. El formulario de "Agregar variante" reutiliza un `<select>` nativo sin estilizar para el largo de uña, con `style={{border: ...}}` en línea — mismo patrón crudo que el resto de la página.
6. El `ImageUploader` por servicio (agregado en el SPEC 09) ya luce bien porque es la única pieza de esta pantalla que sale del sistema de marca — es la prueba de que el resto de la página puede verse así de bien con el mismo esfuerzo.

## 6. Catálogo de diseño

La pantalla más cruda de todo el panel. No usa ninguna pieza de `@/components/brand`: ni `AdminPageHeader`, ni `Panel`, ni `BrandButton`, ni `Title`/`Body`. Es shadcn puro con `<select>` y `<input type="color">` nativos.

1. **El selector de categoría es el `<select>` del sistema operativo**, sin estilizar más allá de un borde inline. Es literalmente "el select genérico" que menciona el pedido original.
2. **El selector de color nativo (`<input type="color">`)** abre el color picker del sistema operativo — no hay forma de reutilizar los `Swatch` que ya existen y se ven bien en el diseñador de uñas del lado público.
3. **Cada elemento del catálogo es un `<li>` suelto**, sin tarjeta, sin separación clara entre categorías más que un `<h2>` de texto plano.
4. **Los minutos extra no se pueden editar** una vez creado el elemento — solo el precio tiene `onBlur` para guardar; para cambiar la duración extra hay que borrar y recrear.
5. Sin confirmación al desactivar (no es grave, es reversible, pero tampoco hay ningún feedback visual más que el texto tachado).
6. Se rompe en 390px igual que Servicios: fila `label + input + "Desactivar"` no envuelve.

## 7. Portafolio

1. Mismo patrón de `<div style={{...}}>` reinventando `Panel`, tanto en el formulario de "Nueva foto" como en cada tarjeta de foto.
2. El botón "Guardar en el portafolio" se ve permanentemente atenuado (color primary claro a 32px) incluso cuando está habilitado — igual que el resto de los botones shadcn `default` de esta tanda.
3. "Despublicar"/"Publicar" y "Eliminar" son `Button variant="outline"` y `variant="destructive"` respectivamente — acá sí hay distinción de peso (mejor que Servicios/Catálogo), es la pantalla menos mala de las tres crudas.
4. El campo "Orden" es un número suelto sin drag-and-drop; con más de 4-5 fotos, reordenar a mano escribiendo números es tedioso. Fuera de alcance para esta pasada (tocaría UX de reordenamiento, no solo estética), se deja anotado.

## 8. Marca

1. Estructura ya sólida (formulario + preview en vivo claro/oscuro lado a lado). No hace falta rehacerla, solo pulir tres cosas puntuales.
2. **Los campos de URL de logo y portada muestran la URL completa de Vercel Blob** (`https://qr2ouln3uia3q0sv.public.blob.vercel-storage.com/branding/...`) en un `Input` de ancho fijo, aunque `ImageUploader` ya muestra la miniatura arriba. Es información redundante y fea; alcanza con el campo de texto colapsado a un link corto ("Ver URL") o quitarlo cuando hay preview.
3. `<select>` nativo para arquetipo y par tipográfico, mismo problema que en el resto del admin pero acá al menos está dentro de un `Label`+contenedor con espaciado consistente.
4. El swatch de color (`input type="color"`) al lado del campo de texto no tiene ningún borde que lo separe visualmente del campo — a simple vista parece un adorno, no un control.

---

## Prioridad sugerida

**Tanda 1 — los tres CRUD crudos al sistema de marca**
Servicios y Catálogo de diseño a `Panel`/`AdminCard`, arreglar el overflow de 390px en ambas, distinguir peso de acciones (texto plano → `BrandButton ghost`/`danger`), reemplazar banners amarillos hardcodeados por `InfoNote`.

**Tanda 2 — reservas y disponibilidad**
Traducir el badge de estado crudo en Reservas, envolver "Horario base semanal" en `Panel`/`Label` reales, subir contraste del ítem activo del sidebar.

**Tanda 3 — terminación**
Portafolio a `Panel`, limpiar los campos de URL redundantes en Marca, revisar tono de los botones "Guardar" (¿subir a `BrandButton` o al menos a un tamaño/peso mayor dentro de shadcn?).
