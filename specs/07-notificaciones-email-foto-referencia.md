# SPEC 07 — Notificaciones por email y foto de referencia en el diseño

> **Estado:** Implemented
> **Depende de:** SPEC 01, SPEC 02, SPEC 03, SPEC 05, SPEC 06
> **Fecha:** 2026-08-01
> **Objetivo:** Que la clienta reciba un email de confirmación o cancelación de su reserva vía Resend, con el branding del tenant, y que pueda adjuntar una foto de referencia a su diseño personalizado que la profesional vea en `/admin/reservas`.

Dependencias: el SPEC 01 por `users`, `professional_id` y los guards; el SPEC 02 por los estados `confirmed` y `cancelled` de la reserva; el SPEC 03 por el flujo de diseño custom (`NailDesigner`, `source = 'client'`, la columna `reference_image_url` que dejó en `null`); el SPEC 05 por el `ImageUploader`, el store de Vercel Blob y el patrón de wiring de infraestructura externa; el SPEC 06 por el precedente de extender el guard de `/api/upload` para que una clienta (no solo la profesional) pueda subir un archivo.

---

## Alcance

**Dentro:**

- Integración con **Resend**: instalar `resend`, crear puerto `src/server/domain/notification/email-sender.port.ts` y su implementación `src/server/infrastructure/email/resend-email-sender.ts`, siguiendo el patrón de wiring de `VercelBlobStorage`.
- Email de confirmación: se dispara desde `ConfirmBookingUseCase` cuando la profesional pasa la reserva de `pending` a `confirmed`. Va solo a la clienta, a la dirección de `users.email`.
- Email de cancelación: se dispara desde `CancelBookingByClientUseCase` cuando la clienta cancela su propia reserva. También solo a la clienta — hoy no existe cancelación iniciada por la profesional, así que no hay otro disparador.
- Las dos plantillas llevan el branding del tenant (`tenant_branding`: logo, color primario) resuelto igual que en el micrositio.
- Remitente `onboarding@resend.dev` vía `RESEND_API_KEY` en `.env`. Migrar a dominio propio es cambiar la variable de entorno después, no código.
- Tabla nueva `email_notifications`: un registro por intento de envío (`booking_id`, `type` — `confirmation` o `cancellation` —, `status` — `sent` o `failed` —, `error_message`, `sent_at`). El envío nunca bloquea la transición de la reserva: se intenta después de escribir el nuevo estado, y un fallo solo se registra.
- Foto de referencia dentro del diseñador (`NailDesigner`, SPEC 03): campo opcional con `ImageUploader` para adjuntar una foto de inspiración al diseño custom completo. Una foto por diseño, no una por uña.
- La reserva exige sesión antes de entrar al paso "Diseño" del flujo de `/[slug]/reservar` (hoy solo se exige al confirmar). Sin sesión, redirige a `/[slug]/login`.
- Nueva condición en `onBeforeGenerateToken` de `/api/upload`: una clienta autenticada puede subir una foto de referencia de diseño sin necesitar un booking existente (a diferencia del caso de reviews, que exige un booking `completed` propio).
- `CreateBookingInput` suma `designReferenceImageUrl`, que viaja hasta `DrizzleBookingRepository.createWithDesign` y queda en `designs.reference_image_url`. Sin migración: la columna ya existe desde el SPEC 03.
- `/[slug]/admin/reservas` muestra la foto de referencia (miniatura) cuando la reserva tiene un diseño custom con foto. Requiere que la página busque el diseño asociado al booking, cosa que hoy no hace.
- Tests con Vitest sobre el email sender (con un fake que no llama a Resend de verdad), los dos puntos de disparo, y el nuevo caso del guard de `/api/upload`.

**Fuera de alcance (para specs futuros):**

- Recordatorio de reserva por email. Necesita un cron o scheduled function, un dominio aparte de disparar-en-una-transición.
- Email a la profesional. Ya ve todo en `/admin/reservas`; agregarlo es otra decisión de producto, no una consecuencia de tener Resend.
- Email de detalle de diseño como mensaje separado (lo mencionaba el SPEC 03). El email de confirmación ya cubre el mismo momento; duplicarlo es ruido.
- Reintentos automáticos de un envío fallido. `email_notifications` deja el registro; reintentar es infraestructura de colas, otro spec.
- Dominio propio verificado (SPF/DKIM) en Resend. Configuración manual futura, cambio de variable de entorno.
- Editar o reemplazar la foto de referencia después de creada la reserva. `designs` no tiene flujo de edición post-booking, igual que `price_clp` y `duration_minutes` son fotografías congeladas.
- Que la clienta vuelva a ver su propia foto de referencia en `/[slug]/cuenta`. Solo se muestra en `/admin/reservas` por ahora.
- Recorte, rotación o compresión de la foto de referencia. Se sube lo que la clienta elige, igual que portafolio y reviews.
- Recuperación de contraseña por email. Sigue diferida desde el SPEC 01, es otro dominio (auth, no notificaciones transaccionales de reserva).

---

## Modelo de datos

### Tabla nueva: `email_notifications`

Registro de cada intento de envío. Insert-only, sin updates: cada intento es una fila nueva.

| Columna           | Tipo                                       | Uso                                                                  |
| ----------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| `id`              | `uuid`, PK, `gen_random_uuid()`            |                                                                      |
| `professional_id` | `uuid`, FK a `professionals.id`, not null  | Eje de aislamiento entre tenants, como toda tabla de negocio         |
| `booking_id`      | `uuid`, FK a `bookings.id`, not null       | La reserva que originó el envío                                      |
| `type`            | enum `email_notification_type`, not null   | `confirmation` \| `cancellation`                                     |
| `status`          | enum `email_notification_status`, not null | `sent` \| `failed`                                                   |
| `error_message`   | `text`, nulo                               | Mensaje de Resend o de la excepción, solo cuando `status = 'failed'` |
| `sent_at`         | `timestamptz`, not null, `defaultNow()`    | Momento del intento, no de la reserva                                |

Dos enums nuevos en `src/server/infrastructure/db/schema/enums.ts`, mismo patrón que `bookingStatusEnum` y `reviewStatusEnum`:

```ts
export const emailNotificationTypeEnum = pgEnum('email_notification_type', [
  'confirmation',
  'cancellation',
]);
export const emailNotificationStatusEnum = pgEnum('email_notification_status', ['sent', 'failed']);
```

Es la única migración del spec.

### `designs.reference_image_url` (ya existe)

Columna `text`, nula, agregada en el SPEC 01 y sin escritor desde el SPEC 03. Este spec le agrega su primer y único escritor: `CreateBookingUseCase`, cuando `input.designReferenceImageUrl` viene con valor, lo pasa a `bookingRepository.createWithDesign(...)` junto al resto del diseño. Sin migración.

### Puerto de dominio: `EmailSender`

```ts
export interface EmailSender {
  send(input: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ ok: true } | { ok: false; error: string }>;
}
```

`ResendEmailSender` en infraestructura lo implementa envolviendo el SDK de `resend`, mismo patrón que `VercelBlobStorage` envuelve `@vercel/blob`.

### Plantillas

Dos funciones puras en `src/server/domain/notification/email-templates.ts`, sin Drizzle ni Next.js:

```ts
function buildConfirmationEmail(input: { booking: Booking; branding: TenantBranding }): {
  subject: string;
  html: string;
};
function buildCancellationEmail(input: { booking: Booking; branding: TenantBranding }): {
  subject: string;
  html: string;
};
```

Devuelven asunto y HTML ya armados con el logo y el color primario del tenant. Se testean con Vitest sobre el HTML resultante, sin tocar Resend.

---

## Plan de implementación

Cada paso deja el proyecto ejecutable y es commiteable por sí solo. Los pasos 1 a 6 son el envío de email completo, 7 a 12 la foto de referencia, y el resto cierre.

1. **Migración.** Crear `src/server/infrastructure/db/schema/notifications.ts` con la tabla `email_notifications`, y agregar `emailNotificationTypeEnum` / `emailNotificationStatusEnum` a `enums.ts`. Correr `npm run db:generate`. Verificación: la migración generada crea una tabla y dos tipos, y `npx tsc --noEmit` queda limpio.

2. **Dependencia y config.** Instalar `resend`. Agregar `RESEND_API_KEY` y `EMAIL_FROM_ADDRESS` (default `onboarding@resend.dev`) al `.env`. Crear `src/server/domain/notification/email-sender.port.ts` con la interfaz `EmailSender`. Verificación: compila sin depender de infraestructura.

3. **Plantillas.** Crear `src/server/domain/notification/email-templates.ts` con `buildConfirmationEmail` y `buildCancellationEmail`, funciones puras que arman asunto y HTML con el logo y color primario de `TenantBranding`. Verificación: tests cubren que el HTML incluye el nombre de la profesional, el logo cuando existe y el color primario, para dos arquetipos distintos.

4. **Infraestructura de envío y log.** Crear `src/server/infrastructure/email/resend-email-sender.ts` implementando `EmailSender` sobre el SDK de `resend`. Crear `src/server/domain/notification/email-notification-repository.port.ts` y `drizzle-email-notification.repository.ts` con un único método `create(...)`. Verificación: un script manual inserta un registro `sent` a mano y aparece en `db:studio`.

5. **Caso de uso de notificación.** Crear `send-booking-notification.use-case.ts`: recibe `bookingId` y `type`, resuelve el booking, la clienta y el `TenantBranding`, arma la plantilla correspondiente, llama a `EmailSender.send`, y escribe el resultado en `email_notifications` sea cual sea. Nunca lanza: un fallo de Resend se captura y se registra como `failed`. Verificación: tests con fakes cubren envío exitoso (`sent`) y envío fallido (`failed`, sin excepción propagada).

6. **Wiring en las rutas.** En `src/app/api/bookings/[id]/confirm/route.ts` y `.../cancel/route.ts`, invocar `SendBookingNotificationUseCase` después de que el use case de confirmación o cancelación escribe con éxito, dentro de su propio `try/catch` para que un fallo de email nunca cambie la respuesta HTTP de la reserva. Verificación: confirmar una reserva con `RESEND_API_KEY` inválida sigue respondiendo 200 y la reserva queda `confirmed`; la tabla registra el intento como `failed`.

7. **Guard de subida para la foto de referencia.** En `src/app/api/upload/route.ts`, agregar una condición nueva junto a `canUploadAsReviewClient`: cualquier sesión con `role === "client"` puede subir con un `clientPayload` de propósito `design-reference`, sin requerir un booking existente. Verificación: un `POST` de una clienta sin booking obtiene token bajo este propósito; el caso de reviews sigue exigiendo booking `completed` sin cambios.

8. **Login antes del paso Diseño.** En `ReservarForm.tsx`, si no hay sesión al pasar de `"select"` a `"design"`, redirigir a `/[slug]/login` en vez de avanzar. Verificación: sin sesión, el botón "Siguiente" del paso "select" lleva a login; con sesión, avanza al diseñador como hoy.

9. **Campo de foto en el diseñador.** En `NailDesigner.tsx`, agregar un campo opcional con `ImageUploader` (`pathPrefix` propio, `clientPayload` con el propósito `design-reference`) y sumar `referenceImageUrl` a `NailDesignerResult`. Verificación: la clienta sube una foto durante el diseño y ve el preview antes de continuar.

10. **Propagar la URL hasta la reserva.** Sumar `designReferenceImageUrl` a `CreateBookingInput` en `create-booking.use-case.ts`, y pasarlo a `bookingRepository.createWithDesign(...)`. Actualizar `ReservarForm.tsx` para incluirlo en el `POST` a `/api/bookings`. Verificación: crear una reserva con diseño custom y foto deja `designs.reference_image_url` con la URL subida.

11. **Foto de referencia en el panel.** En `/[slug]/admin/reservas`, cuando `booking.designId` no es nulo, buscar el diseño y mostrar la miniatura de `reference_image_url` si existe. Verificación: una reserva con diseño y foto la muestra en el panel; una sin diseño, o con diseño sin foto, no rompe el render.

12. **Tests.** Cerrar cobertura sobre las plantillas de email, el caso de uso de notificación (éxito y fallo), y el nuevo caso del guard de `/api/upload`. Verificación: `npm test` pasa en verde.

13. **Deploy.** Correr `npm run db:migrate` contra Neon primero. Confirmar `RESEND_API_KEY` y `EMAIL_FROM_ADDRESS` en las variables de entorno de Vercel. Después `git push origin spec-07-...:main`. Verificación: una clienta real confirma o cancela en producción y recibe el email; una foto de referencia sube y se ve en el panel.

---

## Criterios de aceptación

### Email de confirmación y cancelación

- [ ] Confirmar una reserva (`pending` → `confirmed`) envía un email a la clienta con los datos de la reserva.
- [ ] Cancelar una reserva propia envía un email a la clienta confirmando la cancelación.
- [ ] El email lleva el logo y el color primario del tenant cuando `tenant_branding` los tiene configurados.
- [ ] Un tenant sin logo configurado envía el email igual, sin logo roto.
- [ ] El email va únicamente a la clienta; la profesional no recibe copia.
- [ ] Crear una reserva (`pending`) no dispara ningún email todavía.
- [ ] Completar (`completed`) o marcar `no_show` una reserva no dispara ningún email.

### Resiliencia del envío

- [ ] Una `RESEND_API_KEY` inválida o un fallo de Resend no impide que la reserva quede `confirmed` o `cancelled`.
- [ ] El endpoint de confirmar o cancelar responde 200 aunque el envío de email falle.
- [ ] Cada intento de envío exitoso queda registrado en `email_notifications` con `status = 'sent'`.
- [ ] Cada intento fallido queda registrado con `status = 'failed'` y un `error_message` legible.
- [ ] `email_notifications.professional_id` permite filtrar los envíos por tenant.

### Foto de referencia del diseño

- [ ] Sin sesión, intentar avanzar del paso "select" al paso "design" en `/[slug]/reservar` redirige a `/[slug]/login`.
- [ ] Con sesión, el paso "design" muestra el campo de foto de referencia junto al diseñador.
- [ ] La foto es opcional: un diseño custom sin foto se guarda igual.
- [ ] Subir una foto y completar la reserva deja `designs.reference_image_url` con la URL subida.
- [ ] Un diseño de catálogo (`source = 'template'`, si existiera ese flujo) no lleva foto de referencia.
- [ ] Una clienta autenticada sin ningún booking puede obtener token de subida para este propósito.
- [ ] El caso de reviews del SPEC 06 sigue exigiendo un booking `completed` propio; el guard nuevo no lo afloja.
- [ ] Una petición sin sesión no obtiene token bajo ningún propósito.

### Panel admin

- [ ] `/[slug]/admin/reservas` muestra la miniatura de la foto de referencia cuando la reserva tiene diseño custom con foto.
- [ ] Una reserva sin diseño no muestra ningún espacio vacío de foto.
- [ ] Una reserva con diseño pero sin foto tampoco rompe el render.

### Regresión

- [ ] La migración es aditiva y no rompe ninguna consulta existente.
- [ ] El flujo de reserva completo sigue funcionando de punta a punta, con y sin diseño custom.
- [ ] La moderación de reviews del SPEC 06 sigue funcionando sin cambios.
- [ ] `npm test` pasa en verde.

---

## Decisiones

### Alcance

- **Sí:** un solo SPEC 07 con los dos pendientes (Resend y `reference_image_url`), aunque tocan dominios distintos. Decisión explícita del usuario al arrancar el spec, aceptando el costo de un spec con dos frentes.
- **No:** recordatorio de reserva. Necesita un cron o scheduled function — infraestructura de scheduling, no de envío — y es un dominio aparte que merece su propio spec.
- **No:** email de detalle de diseño como mensaje separado, como sugería el SPEC 03. El email de confirmación ya cubre ese momento; separarlo duplica el envío sin agregar información nueva.
- **No:** notificación de review nueva por email. El SPEC 06 ya resolvió el problema con el contador del `AdminSidebar`, sin infraestructura nueva. Reabrirlo acá sería redundante.

### Email

- **Sí:** solo dos eventos, confirmación y cancelación. Son las dos transiciones de estado que la clienta necesita confirmar por fuera de la app; el resto de las transiciones (`completed`, `no_show`) las gestiona la profesional y no requieren aviso.
- **Sí:** solo a la clienta. La profesional ya vive en `/admin/reservas`; sumarle email es una carga de bandeja de entrada sin necesidad real todavía.
- **Sí:** con branding del tenant. El micrositio ya tiene los tokens resueltos por el SPEC 04; ignorarlos en el email sería inconsistente con el resto del producto.
- **No:** plantilla fija sin branding. Habría sido menos trabajo, pero el costo de leer `TenantBranding` una vez más es bajo y ya está resuelto desde el SPEC 04.
- **Sí:** `onboarding@resend.dev` como remitente. Arranca sin configuración DNS; migrar a dominio propio es una variable de entorno, no un cambio de código.
- **No:** dominio propio verificado desde ya. Es un paso manual (records SPF/DKIM) que no bloquea nada de este spec y se puede sumar después sin tocar el código de envío.
- **Sí:** el fallo de envío nunca bloquea la reserva. Un email es una conveniencia, la reserva es el negocio; que Resend esté caído no puede tumbar el flujo de agendar o cancelar.
- **Sí:** tabla `email_notifications` en vez de solo loguear en consola. Un log de servidor se pierde entre deploys de Vercel; una tabla permite auditar qué se envió y a quién, sobre todo mientras se prueba con el remitente de pruebas.
- **No:** reintentos automáticos. Es infraestructura de colas (retry con backoff, dead-letter) para un volumen que hoy no lo justifica. El registro deja la puerta abierta a resolverlo después.

### Foto de referencia

- **Sí:** una foto por diseño completo, no por uña. Coincide con la columna existente (`reference_image_url` es un `text`, no un array) y evita una migración adicional.
- **Sí:** dentro del diseñador (`NailDesigner`), no en un paso aparte. Es donde la clienta ya está pensando en cómo quiere sus uñas; separar la foto a otra pantalla es un paso más en el camino más caro de romper del producto.
- **Sí:** la profesional la ve en `/admin/reservas`. Es la razón de ser del campo: saber qué quiere la clienta antes de la cita.
- **No:** que la clienta la vea de nuevo en `/[slug]/cuenta`. No hay una necesidad planteada todavía; agregarlo es una pantalla más sin un caso de uso concreto.
- **No:** edición de la foto después de creada la reserva. `designs` no tiene flujo de edición post-booking, y tratarla como fotografía congelada es consistente con `price_clp` y `duration_minutes`.
- **No:** recorte, rotación o compresión en el cliente. Se sube lo que la clienta elige, mismo criterio que portafolio y reviews en el SPEC 05 y 06.

### Guard de subida

- **Sí:** exigir sesión antes del paso "design" en el flujo de reserva. Es la única forma de tener un `session.user.id` disponible cuando la clienta sube la foto, dado que en ese punto todavía no existe el booking.
- **No:** permitir subida anónima. Dejaría el store abierto a cualquiera sin cuenta, mismo riesgo que el SPEC 05 ya cerró para el resto de las subidas.
- **No:** mover el picker de foto al paso final de agendamiento. Habría resuelto el problema de la sesión gratis, pero contradice la decisión de que la foto viva junto al diseñador, tomada antes de conocer este detalle técnico.
- **Sí:** una condición nueva e independiente en `onBeforeGenerateToken`, separada de `canUploadAsReviewClient`. Evita que aflojar el guard para la foto de referencia afloje sin querer el guard, más estricto, de las reviews.

### Datos

- **Sí:** `email_notifications` con `professional_id` propio, siguiendo la convención del proyecto de que toda tabla de negocio lleva ese eje de aislamiento.
- **No:** desnormalizar el estado del último envío dentro de `bookings`. Sería una lectura más rápida y un dato más que se desincroniza; `email_notifications` ya sirve como historial completo.
- **Sí:** `CreateBookingInput` recibe `designReferenceImageUrl` desde el cliente, igual que ya recibe el resto del payload de diseño. Se persiste sin validar contenido de la imagen porque esa validación ya la hizo `/api/upload` al emitir el token.

---

## Riesgos

| Riesgo                                                                                                                                                     | Mitigación                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exigir login antes del paso "design" adelanta la fricción de cuenta para toda clienta, incluso la que no va a usar diseño custom.                          | El login ya era obligatorio para completar cualquier reserva — `POST /api/bookings` ya rechaza sin `session.user.role === "client"` —. Este spec solo adelanta el momento en el flujo, no agrega un requisito nuevo. Hoy, además, una clienta anónima que llega hasta "schedule" pierde todo lo llenado al chocar con ese 401 recién al final; adelantar el login evita justamente eso. |
| La condición nueva en `onBeforeGenerateToken` podría, por descuido al escribir el código, aflojar sin querer el guard más estricto de reviews del SPEC 06. | Es una condición independiente, agregada junto a `canUploadAsReviewClient` sin tocarla. El criterio de aceptación específico cubre que el caso de reviews siga exigiendo booking `completed` sin cambios.                                                                                                                                                                               |
| Leer `TenantBranding` en cada confirmación y cancelación agrega una consulta por transición de estado.                                                     | Es una consulta por `professional_id` sobre una tabla chica, del mismo orden que la que ya acepta el SPEC 06 para el promedio de reviews en cada render de landing.                                                                                                                                                                                                                     |
| Un fallo de Resend queda registrado pero nadie lo revisa activamente: no hay alertas.                                                                      | Aceptado explícitamente — está fuera de alcance cualquier sistema de alertas. `email_notifications` queda disponible para auditar a mano con `db:studio` si se sospecha un problema.                                                                                                                                                                                                    |
| `RESEND_API_KEY` falta en las variables de entorno de Vercel al deployar, y todos los envíos fallan silenciosamente en producción.                         | El paso 13 del plan verifica la variable antes del push, mismo patrón que `BLOB_READ_WRITE_TOKEN` en el SPEC 05.                                                                                                                                                                                                                                                                        |
| La migración agrega una tabla nueva contra la base de Neon de producción, la misma que usa el `.env` local.                                                | Es aditiva — tabla nueva, sin tocar ninguna existente — y corre antes del push según el orden de deploy del proyecto.                                                                                                                                                                                                                                                                   |
| `onboarding@resend.dev` tiene límites de envío y puede caer en spam con más frecuencia que un dominio propio.                                              | Costo aceptado del arranque sin configuración DNS. Migrar a dominio propio es cambiar `EMAIL_FROM_ADDRESS` y verificar records, sin tocar código.                                                                                                                                                                                                                                       |

---

## Lo que **no** entra en este spec

- Recordatorio de reserva por email.
- Email a la profesional.
- Email de detalle de diseño como mensaje separado.
- Reintentos automáticos de envío fallido.
- Dominio propio verificado en Resend.
- Editar la foto de referencia después de creada la reserva.
- Ver la foto de referencia desde `/[slug]/cuenta`.
- Recorte, rotación o compresión de la foto.
- Recuperación de contraseña por email.

Cada una de esas, si entra, va en su propio spec.
