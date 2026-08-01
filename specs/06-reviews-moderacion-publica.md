# SPEC 06 — Reviews: moderación y vista pública

> **Estado:** Implemented
> **Depende de:** SPEC 01, SPEC 02, SPEC 04, SPEC 05
> **Fecha:** 2026-08-01
> **Objetivo:** Que la clienta con una reserva completada deje una opinión con nota, texto y foto, que la profesional la apruebe o rechace antes de que se vea, y que las aprobadas se muestren en el micrositio.

Dependencias: el SPEC 01 por la tabla `reviews` y los guards, el SPEC 02 por el estado `completed` de las reservas, el SPEC 04 por el theming del micrositio, y el SPEC 05 por el `ImageUploader` y el store de Vercel Blob. El SPEC 03 no entra: el diseñador de uñas no toca este flujo.

---

## Alcance

**Dentro:**

- Formulario de opinión en `/[slug]/cuenta/opinar/[bookingId]`, alcanzable con un botón "Opinar" en cada reserva `completed` de `/[slug]/cuenta`. Lleva nota de 1 a 5, texto, foto opcional e Instagram opcional.
- Subida de la foto de la review con el `ImageUploader` del SPEC 05. Se sube un archivo, nunca se pega una URL.
- Edición de la propia opinión mientras siga en `pending`. Una vez moderada, queda congelada.
- Moderación en `/[slug]/admin/opiniones`: pendientes arriba, aprobar, rechazar, y revertir cualquiera de las dos en cualquier momento.
- Contador de pendientes en el `AdminSidebar`.
- Página pública `/[slug]/opiniones` con todas las `approved`, más recientes primero.
- Bloque en la landing con las 3 `approved` más recientes y link a la página completa.
- Nota promedio y cantidad de opiniones, calculadas en vivo sobre las `approved` con una función pura del dominio.
- Columna nueva `reviews.author_instagram`, con su migración.
- Filas de review en el `db:seed`, idempotentes.
- Tests con Vitest sobre el promedio, la regla de elegibilidad, las validaciones del formulario y las transiciones de estado.

**Fuera de alcance (para specs futuros):**

- Respuesta pública de la profesional a una review. No hay columna para eso y agregarla es otra migración; además abre moderar la respuesta.
- Notificación por email a la profesional cuando entra una review. Resend sigue diferido desde el SPEC 02; el contador del sidebar es el reemplazo.
- Reescribir una review rechazada. `booking_id` es único y permitir reintentos convierte la moderación en un ping-pong.
- Borrar reviews. Rechazar ya las saca de lo público.
- Motivo del rechazo, y mostrárselo a la clienta. La clienta no recibe feedback del rechazo.
- Plazo para opinar después de completada la reserva. Sin límite de tiempo.
- Instagram como dato de perfil en `users`. Va por review, no por persona.
- "Opiniones" en la barra inferior. Se llega desde la landing.
- Paginación, filtro por nota y orden alternativo en la página pública.
- Lightbox, zoom o carrusel sobre la foto de la review. Grilla simple, igual que el portafolio.
- Denuncias o reportes de reviews por parte de terceros.

---

## Modelo de datos

La tabla `reviews` existe completa desde el SPEC 01 y está vacía. Este spec le agrega **una columna** y no toca ninguna otra tabla.

### `reviews` (existe)

| Columna           | Uso en este spec                                                                      |
| ----------------- | ------------------------------------------------------------------------------------- |
| `professional_id` | Se deriva del booking, nunca llega desde el cliente                                   |
| `booking_id`      | Único. Una opinión por reserva, y es lo que impide reescribir una rechazada           |
| `client_user_id`  | La sesión que escribe. Debe ser la dueña del booking                                  |
| `rating`          | 1 a 5. La base ya lo fuerza con `CHECK (rating BETWEEN 1 AND 5)`                      |
| `body`            | Obligatorio. Entre 10 y 1000 caracteres, validado en la capa de aplicación            |
| `photo_url`       | Opcional. URL que devuelve Vercel Blob, nunca un valor tipeado                        |
| `status`          | Nace `pending`. La columna es `not null` sin default: el valor lo pone el caso de uso |
| `moderated_at`    | Se escribe en cada transición a `approved` o `rejected`                               |

### Columna nueva

```ts
authorInstagram: text("author_instagram"),
```

Opcional. Se guarda normalizado: sin `@`, en minúsculas, sin URL. Se valida contra el formato de Instagram (1 a 30 caracteres, letras, números, punto y guion bajo). Si no valida, 400 y no se escribe la fila.

Es la única migración del spec, y es aditiva sobre una tabla vacía.

### Resumen de notas

El promedio y la cantidad no son columnas: se calculan sobre las reviews `approved` en una función pura del dominio.

```ts
function ratingSummary(reviews: Review[]): { average: number; count: number } | null;
```

Devuelve `null` cuando no hay ninguna review aprobada. El promedio se redondea a un decimal para mostrarlo. Un tenant sin opiniones no muestra el bloque, no muestra un cero.

### Estados

`pending` → `approved` o `rejected`, y de vuelta, sin límite de veces. Cada transición actualiza `moderated_at`. No hay borrado: una review rechazada se queda en la base, invisible para el público.

### Blobs

La foto se borra con `del()` en un solo caso: la clienta edita su review `pending` y reemplaza la imagen. La URL vieja está en la fila, así que borrarla es directo. Una review rechazada conserva su foto — puede volver a `approved` en cualquier momento.

---

## Plan de implementación

Cada paso deja el proyecto ejecutable y es commiteable por sí solo. Los pasos 1 a 7 son el backend completo, 8 a 11 la clienta y la moderación, 12 a 14 lo público, y el resto cierre.

1. **Migración.** Agregar `authorInstagram` a `reviews` en `src/server/infrastructure/db/schema/content.ts`. Correr `npm run db:generate`. Verificación: la migración generada es un solo `ALTER TABLE ... ADD COLUMN` y `npx tsc --noEmit` queda limpio.

2. **Dominio: entidad y puerto.** Crear `src/server/domain/review/review.entity.ts` y `reviews-repository.port.ts` con listar por profesional, listar aprobadas, contar pendientes, buscar por id, buscar por `booking_id`, crear y actualizar. Puro TypeScript. Verificación: compila sin importar nada de infraestructura.

3. **Dominio: funciones puras.** Crear `rating-summary.ts` con `ratingSummary`, y `instagram-handle.ts` con la normalización (saca `@`, saca la URL, pasa a minúsculas) y la validación de formato. Verificación: tests cubren promedio con cero, una y varias reviews aprobadas, el redondeo a un decimal, y handles con `@`, con URL completa, con caracteres inválidos y de más de 30 caracteres.

4. **Repositorio.** Crear `drizzle-reviews.repository.ts` implementando el puerto. El listado público filtra por `status = 'approved'` y ordena por `created_at` descendente; el conteo de pendientes es un `count` por `professional_id`. Verificación: un script manual inserta una review a mano, la lee desde el listado de la profesional y confirma que no aparece en el público mientras siga `pending`.

5. **Caso de uso: escribir y editar.** Crear `submit-review.use-case.ts`. Valida: la sesión es la clienta dueña del booking, el booking está en `completed`, no existe ya una review para ese `booking_id`, `rating` entre 1 y 5, `body` entre 10 y 1000 caracteres, y el handle de Instagram con formato válido si viene. `professional_id` se deriva del booking. La review nace `pending`. El mismo caso de uso cubre la edición mientras el estado siga `pending`, y borra el blob anterior con `del()` si la foto se reemplaza. Verificación: tests con repositorio fake cubren booking ajeno, booking `confirmed`, booking ya opinado, `body` de 5 caracteres, `body` de 1200, `rating` 0 y 6, handle inválido, y edición de una review ya `approved`.

6. **Caso de uso: moderar y leer.** Crear `moderate-review.use-case.ts` con las transiciones a `approved` y `rejected`, escribiendo `moderated_at` en cada una, y `list-reviews.use-case.ts` con el listado de la profesional, el listado público y el conteo de pendientes. Verificación: tests con fake cubren aprobar, rechazar, revertir de `approved` a `rejected`, y que una profesional no pueda moderar la review de otro tenant.

7. **Rutas de la API.** Crear `src/app/api/reviews/route.ts` con `POST` y `PATCH` para la clienta, y `src/app/api/reviews/[id]/approve/route.ts` y `[id]/reject/route.ts` para la profesional, siguiendo el patrón de `bookings/[id]/confirm`. Cada uno detrás de su guard. Verificación: un `POST` sobre un booking de otra clienta responde 403 sin escribir, y un `POST` de aprobación sin sesión de profesional responde 401.

8. **Formulario de opinión.** Crear `/[slug]/cuenta/opinar/[bookingId]`: selector de nota, textarea con contador de caracteres, `ImageUploader` para la foto, campo de Instagram opcional, y error legible. Si la reserva no es de la sesión o no está `completed`, la página no se renderiza. Verificación: la clienta envía una opinión y queda `pending` en la base.

9. **Botón "Opinar" en la cuenta.** En `/[slug]/cuenta`, cada reserva `completed` muestra el botón. Si ya opinó, muestra el estado en su lugar: "En revisión" para `pending`, "Publicada" para `approved`, "No publicada" para `rejected`, sin motivo. Una review `pending` lleva de vuelta al formulario para editarla. Verificación: los cuatro estados se ven correctos en la tarjeta.

10. **Página de moderación.** Crear `/[slug]/admin/opiniones` con las pendientes arriba y el resto abajo, mostrando nota, texto, foto, Instagram y la reserva asociada, con botones de aprobar y rechazar. Agregar el destino a `AdminSidebar`. Verificación: aprobar una review la hace aparecer en la página pública, y rechazarla la saca.

11. **Contador de pendientes.** Mostrar la cantidad de `pending` junto al destino "Opiniones" en el `AdminSidebar`. Verificación: el contador aparece con reviews pendientes y desaparece en cero.

12. **Página pública.** Crear `/[slug]/opiniones` como Server Component: promedio, cantidad y la lista completa de aprobadas, más recientes primero, con foto en grilla simple y el Instagram como link con `rel="noopener nofollow"`. Verificación: solo se ven las `approved` y el promedio coincide con el cálculo a mano.

13. **Bloque en la landing.** Agregar a `src/app/[slug]/(public)/page.tsx` las 3 aprobadas más recientes, con promedio, cantidad y link a `/[slug]/opiniones`. Verificación: un tenant sin opiniones aprobadas no renderiza el bloque.

14. **Seed.** Agregar al `db:seed` dos reviews `approved` y una `pending` sobre reservas `completed` del seed, idempotentes como el resto. Verificación: correr el seed dos veces no duplica filas y la landing muestra el bloque.

15. **Tests.** Cerrar cobertura sobre `ratingSummary`, la normalización de Instagram, la regla de elegibilidad, las validaciones de largo y nota, y las transiciones de estado. Verificación: `npm test` pasa en verde.

16. **Deploy.** Correr `npm run db:migrate` contra Neon **antes** de pushear, y después `git push origin spec-06-reviews-moderacion-publica:main`. Verificación: una clienta real opina en producción, la profesional la aprueba, y aparece en la landing.

---

## Criterios de aceptación

### Escribir la opinión

- [ ] Una reserva en `completed` muestra el botón "Opinar" en `/[slug]/cuenta`.
- [ ] Una reserva en `pending`, `confirmed`, `cancelled` o `no_show` no lo muestra.
- [ ] La clienta envía nota, texto y foto, y la review queda en estado `pending`.
- [ ] La review recién creada no se ve en `/[slug]/opiniones` ni en la landing.
- [ ] Un `POST` sobre un booking que no es de la sesión responde 403 y no escribe.
- [ ] Un `POST` sobre un booking que no está `completed` responde 400 y no escribe.
- [ ] Un segundo `POST` sobre el mismo `booking_id` es rechazado.
- [ ] Un `body` de menos de 10 caracteres es rechazado con 400.
- [ ] Un `body` de más de 1000 caracteres es rechazado con 400.
- [ ] Un `rating` de 0 o de 6 es rechazado.
- [ ] `professional_id` se deriva del booking: mandarlo en el cuerpo del `POST` no cambia a qué tenant llega la review.

### Foto e Instagram

- [ ] La foto se sube como archivo con el `ImageUploader`; no hay ningún campo para pegar una URL.
- [ ] Una review sin foto se guarda igual.
- [ ] Editar una review `pending` y reemplazar la foto borra el blob anterior.
- [ ] El Instagram se guarda normalizado: `@Camila`, `camila` y `instagram.com/camila` terminan los tres como `camila`.
- [ ] Un handle con caracteres inválidos o de más de 30 caracteres es rechazado con 400.
- [ ] En la vista pública el Instagram es un link a `instagram.com/handle` con `rel="noopener nofollow"`.
- [ ] Una review sin Instagram se muestra solo con el nombre.

### Edición

- [ ] La clienta edita su review mientras está en `pending` y los cambios se guardan.
- [ ] Editar una review `approved` o `rejected` es rechazado.
- [ ] La tarjeta de la reserva muestra "En revisión", "Publicada" o "No publicada" según el estado.
- [ ] Una review rechazada no muestra motivo ni permite escribir otra.

### Moderación

- [ ] `/[slug]/admin/opiniones` lista las pendientes arriba y las moderadas abajo.
- [ ] Aprobar una review la hace aparecer en `/[slug]/opiniones`.
- [ ] Rechazar una review la saca de la vista pública sin borrar la fila ni el blob.
- [ ] Una review `approved` se puede volver a rechazar, y una `rejected` se puede aprobar.
- [ ] Cada transición actualiza `moderated_at`.
- [ ] Una profesional no puede moderar reviews de otro tenant.
- [ ] Un `POST` de aprobación sin sesión de profesional responde 401.
- [ ] El `AdminSidebar` muestra el conteo de pendientes y no muestra nada en cero.

### Vista pública

- [ ] `/[slug]/opiniones` muestra solo las `approved`, más recientes primero.
- [ ] El promedio mostrado es el de las `approved`, redondeado a un decimal.
- [ ] La cantidad mostrada es la de `approved`, no la total.
- [ ] Con una sola review aprobada el promedio se muestra igual.
- [ ] Un tenant sin reviews aprobadas no renderiza el bloque de la landing ni un promedio en cero.
- [ ] La landing muestra las 3 más recientes y el link a la página completa.
- [ ] El nombre se muestra como nombre de pila más inicial del apellido, tipo "Camila R.".
- [ ] La foto se muestra en grilla, sin lightbox ni zoom.
- [ ] La barra inferior sigue con tres destinos: Inicio, Servicios, Mis Reservas.

### Regresión

- [ ] La migración es aditiva y no rompe ninguna consulta existente.
- [ ] El flujo de reserva completo sigue funcionando de punta a punta.
- [ ] El seed corre dos veces sin duplicar filas.
- [ ] La marca del tenant se aplica en las pantallas nuevas, en variante clara y oscura.
- [ ] `npm test` pasa en verde.

---

## Decisiones

### Alcance

- **Sí:** reviews en su propio spec, como quedó decidido en el SPEC 05. Moderación, estados y vista pública son un bloque con su propia lógica.
- **No:** respuesta pública de la profesional. Necesita otra columna y abre moderar la respuesta además de la review.
- **No:** aviso por email a la profesional. Resend sigue diferido desde el SPEC 02; el contador del sidebar cubre el caso sin infraestructura nueva.
- **No:** denuncias o reportes de terceros. Solo la profesional modera lo que se publica en su micrositio.

### Flujo de la clienta

- **Sí:** página dedicada `/[slug]/cuenta/opinar/[bookingId]`, con el botón de entrada en la tarjeta de la reserva. Nota, texto, foto e Instagram no caben cómodos dentro de la tarjeta.
- **Sí:** sin plazo para opinar. Una ventana temporal es una validación más, un caso borde más y un mensaje de error más, para un volumen que todavía no existe.
- **Sí:** editable mientras esté `pending`. `booking_id` es único, así que reenviar no crea otra fila.
- **No:** editable después de moderada. Cambiar el texto de algo ya aprobado obliga a re-moderar y es la vía obvia para publicar una cosa y dejar otra.
- **Sí:** la clienta ve "No publicada" y nada más cuando la rechazan.
- **No:** mostrarle el motivo del rechazo. Obligaría a la profesional a redactar una justificación en cada rechazo, y lo que consigue es una discusión.
- **No:** permitir reescribir una rechazada. Convierte la moderación en ping-pong.

### Moderación

- **Sí:** página propia `/[slug]/admin/opiniones`. Moderar es una tarea distinta de gestionar la agenda y no comparte contexto con `/admin/reservas`.
- **Sí:** contador de pendientes en el `AdminSidebar`. Es un `count` y es lo único que hace que la moderación efectivamente ocurra.
- **Sí:** transiciones reversibles en las dos direcciones. Un error de clic no debería ser permanente.
- **Sí:** solo rechazar, nunca borrar. Rechazada ya no se ve; borrarla liberaría el `booking_id` único y habilitaría reescribir, que está descartado.

### Datos

- **Sí:** `author_instagram` en `reviews`. Es opt-in explícito por review, no obliga a construir edición de perfil, y una clienta puede querer aparecer en una y no en otra.
- **No:** `instagram_handle` en `users`. Ata el dato a la persona y lo publica en todas sus reviews pasadas y futuras de una sola vez.
- **Sí:** guardar el handle normalizado, sin `@` ni URL. Normalizar al escribir evita repetir la limpieza en cada lectura.
- **Sí:** promedio y cantidad calculados en vivo sobre las `approved`.
- **No:** columnas desnormalizadas `rating_average` y `review_count`. Serían una lectura más rápida y dos datos que se desincronizan con cada moderación.
- **Sí:** `professional_id` derivado del booking. Que llegue desde el cliente es cómo una review termina en el tenant equivocado.
- **Sí:** borrar el blob solo al reemplazar la foto de una review `pending`. Tenemos la URL vieja en la fila, así que es directo, y una rechazada conserva la suya porque puede volver a aprobarse.
- **Sí:** reviews en el seed. Sin eso, ver la vista pública obliga a completar reservas reales contra la base de producción.

### Vista pública

- **Sí:** página dedicada `/[slug]/opiniones` más bloque en la landing, mismo patrón que servicios en el SPEC 05.
- **No:** "Opiniones" en la barra inferior. Cuatro destinos aprietan en móvil y se llega desde la landing.
- **Sí:** mostrar el promedio siempre, aunque haya una sola review. Esconderlo por bajo volumen hace que la sección parezca rota justo cuando el tenant es nuevo.
- **Sí:** las 3 más recientes en la landing.
- **No:** las 3 mejor calificadas. Es maquillar la vitrina, y la página completa lo desmiente en un clic.
- **Sí:** nombre de pila más inicial del apellido. Da persona real sin publicar el nombre completo de una clienta que nunca aceptó aparecer.
- **Sí:** `body` entre 10 y 1000 caracteres. El mínimo corta el "ok"; el máximo evita que una review reviente el layout de la landing.
- **No:** paginación, filtros por nota u orden alternativo. Un tenant chico no llega a cien opiniones.
- **No:** lightbox ni zoom, igual que el portafolio del SPEC 05.

---

## Riesgos

| Riesgo                                                                                                                                                                        | Mitigación                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Es el primer spec en que un usuario **cliente** escribe contenido que se publica en el micrositio. Un fallo en el guard deja a cualquiera publicando en el tenant que quiera. | `professional_id` sale del booking, nunca del cuerpo de la petición, y la elegibilidad se valida en el caso de uso, no en la página. Tres criterios de aceptación cubren booking ajeno, booking no completado y `professional_id` inyectado.              |
| El texto de la review se renderiza en la landing, que es la cara pública del tenant. Contenido sin escapar es XSS almacenado.                                                 | React escapa por defecto y el `body` se renderiza como texto plano, sin `dangerouslySetInnerHTML` ni markdown. El tope de 1000 caracteres además acota el destrozo de layout.                                                                             |
| La foto de la review la sube una clienta, no la profesional. El route handler de subida del SPEC 05 solo emite token para la dueña del tenant.                                | El paso 8 necesita que `onBeforeGenerateToken` acepte también a una clienta con sesión sobre un booking `completed` propio. Es una condición nueva en un guard existente, no un guard nuevo, y sin ella el `ImageUploader` de la review falla en runtime. |
| Una review aprobada por error queda pública en la landing hasta que alguien la note.                                                                                          | Las transiciones son reversibles en las dos direcciones y rechazar la saca de inmediato, sin borrar nada.                                                                                                                                                 |
| La moderación no ocurre nunca porque la profesional no se entera de que hay pendientes.                                                                                       | Contador en el `AdminSidebar`, visible en todas las pantallas del panel. Es el reemplazo explícito del email diferido.                                                                                                                                    |
| El promedio en vivo agrega una consulta de reviews por render de landing.                                                                                                     | Es un filtro por `professional_id` y `status` sobre una tabla chica, del mismo orden que la lectura de marca que ya hace el layout del tenant.                                                                                                            |
| La migración corre contra la base de producción, que es la misma que usa el `.env` local.                                                                                     | La columna es `text` nula sobre una tabla vacía. Igual va antes del push, según el orden del deploy del proyecto.                                                                                                                                         |

---

## Lo que **no** entra en este spec

- Respuesta pública de la profesional a una review.
- Notificación por email cuando entra una review.
- Reescribir una review rechazada, y ver el motivo del rechazo.
- Borrar reviews.
- Plazo para opinar.
- Instagram como dato de perfil en `users`.
- "Opiniones" en la barra inferior.
- Paginación, filtros y orden alternativo en la vista pública.
- Lightbox, zoom o carrusel sobre las fotos.
- Denuncias o reportes de terceros.

Cada una de esas, si entra, va en su propio spec.
