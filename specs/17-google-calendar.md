# SPEC 17 — Sincronización de reservas con Google Calendar

**Estado:** Approved
**Alcance:** conectar la cuenta de Google de la profesional por OAuth2 y espejar sus reservas confirmadas como eventos en su calendario primario — crear al confirmar, borrar al cancelar — con reconexión manual cuando Google revoca el acceso.

Hoy la profesional que quiere ver su día completo tiene que mirar dos lugares: `/admin/reservas` para lo que le reservaron y su calendario personal para todo lo demás. El SPEC 07 ya resolvió avisarle por correo cuando algo cambia; esto resuelve que lo que reservó esté donde ella ya mira su tiempo.

---

## 1. Alcance

**Dentro:**

- Conexión OAuth2 de una cuenta de Google por profesional, con flujo de consentimiento iniciado desde el panel y token de refresco guardado en la base.
- Desconexión desde el panel: borra los tokens y corta el sync. No toca ningún evento ya creado.
- Al conectar, subir de una las reservas confirmadas cuya hora de inicio todavía no pasó y que no tengan evento creado. Es mejor esfuerzo: cada reserva va por separado, las que fallan se saltan y el panel informa cuántas subieron sobre cuántas se intentaron.
- Al confirmar una reserva, crear un evento en el calendario primario de la profesional, con la hora, duración y datos de la clienta congelados en la reserva.
- Al cancelar una reserva que tenía evento (la cancele la clienta o la profesional), borrar ese evento.
- Guardar el id del evento de Google en la reserva, para poder borrarlo después y para no volver a subirla en un backfill posterior.
- Detectar que Google revocó el acceso, marcar la conexión como caída y mostrar en el panel un aviso con botón para reconectar.
- Un fallo de Google nunca cambia el resultado de confirmar o cancelar una reserva, igual que hoy con el correo.

**Fuera de alcance (para specs futuros):**

- Traer los eventos ocupados de Google hacia la disponibilidad, o sea bloquear slots porque la profesional tiene algo agendado en otro lado. Es la mitad más útil de la integración y también la más cara: exige polling o webhooks. Va en su propio spec.
- Escuchar cambios hechos del lado de Google. Si la profesional mueve o borra el evento en su calendario, la app no se entera y la reserva sigue como estaba.
- Reintentar automáticamente lo que falló. Si una reserva no subió, la vía para arreglarlo es desconectar y volver a conectar, que reintenta el backfill sobre las que siguen sin evento.
- Cualquier otro proveedor de calendario (Outlook, Apple, descarga de `.ics`).
- Invitar a la clienta como asistente del evento.
- Sincronizar los estados `completed` y `no_show`. El evento ya ocurrió; cambiarlo después no le sirve a nadie.
- Enlace de Google Meet, recordatorios personalizados, color del evento por servicio.
- La verificación de la app OAuth ante Google. Es trámite operativo, no código.

El backfill es idempotente por construcción: sube solo lo que tiene `google_event_id` nulo, así que reconectar nunca duplica eventos. Eso además le da a la profesional una salida manual cuando algo falló, y por eso el reintento automático se puede dejar afuera sin que quede un agujero.

No hay reagendar en la app hoy — no existe caso de uso — así que no aparece acá. Si algún día se agrega, tendrá que actualizar el evento.

---

## 2. Modelo de datos

### 2.1 Tabla nueva: `google_calendar_connections`

Una fila por profesional, con `unique` en `professional_id`, mismo patrón 1:1 que `tenant_branding`. Vive en `src/server/infrastructure/db/schema/calendar.ts`.

```ts
export const googleCalendarConnections = pgTable('google_calendar_connections', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  professionalId: uuid('professional_id')
    .notNull()
    .unique()
    .references(() => professionals.id),
  googleAccountEmail: text('google_account_email').notNull(),
  refreshToken: text('refresh_token').notNull(),
  status: calendarConnectionStatusEnum('status').notNull().default('active'),
  connectedAt: timestamp('connected_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

`calendarConnectionStatusEnum`: `active` | `revoked`, en `schema/enums.ts` junto al resto.

`googleAccountEmail` no es decorativo: el panel tiene que poder decir "Conectado como karla@gmail.com", porque una profesional con dos cuentas de Google necesita saber en cuál están apareciendo sus horas.

El access token no se guarda. Dura una hora, se pide con el refresh token en cada operación y se descarta. Guardarlo obligaría a manejar su expiración en la base sin ahorrar prácticamente nada.

No hay columna `calendar_id`: se escribe siempre en `primary`, que es un identificador literal que Google acepta en la URL de la API. El día que se pueda elegir calendario, esa columna se agrega en el spec que lo permita.

### 2.2 Columna nueva en `bookings`

```ts
googleEventId: text("google_event_id"),
```

Nula por defecto. Nula significa exactamente una cosa: esta reserva no tiene evento en Google. Es lo que hace idempotente al backfill y lo que decide si cancelar tiene que borrar algo.

### 2.3 Puertos de dominio

Dos, separados a propósito.

`src/server/domain/calendar/google-calendar-connection-repository.port.ts` — la persistencia de la conexión:

```ts
export interface GoogleCalendarConnection {
  id: string;
  professionalId: string;
  googleAccountEmail: string;
  refreshToken: string;
  status: 'active' | 'revoked';
  connectedAt: Date;
}

export interface GoogleCalendarConnectionRepository {
  findByProfessionalId(professionalId: string): Promise<GoogleCalendarConnection | null>;
  upsert(input: {
    professionalId: string;
    googleAccountEmail: string;
    refreshToken: string;
  }): Promise<void>;
  markRevoked(professionalId: string): Promise<void>;
  delete(professionalId: string): Promise<void>;
}
```

`src/server/domain/calendar/calendar-gateway.port.ts` — el proveedor externo, sin una sola mención a Google en la firma:

```ts
export interface CalendarEventDraft {
  summary: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
}

export interface CalendarGateway {
  createEvent(refreshToken: string, draft: CalendarEventDraft): Promise<string>; // devuelve el id del evento
  deleteEvent(refreshToken: string, eventId: string): Promise<void>;
}
```

La implementación `GoogleCalendarGateway` vive en `src/server/infrastructure/calendar/`. Lanza `CalendarAccessRevokedError` (dominio) cuando Google responde `invalid_grant`, que es la señal que dispara el `markRevoked`. Cualquier otro fallo de red o de cuota sube como error genérico y lo traga el `try/catch` del route handler.

### 2.4 Cifrado del `refresh_token` en reposo

`src/server/infrastructure/security/aes-token-cipher.ts`, al lado de `bcrypt-password-hasher.ts` y `crypto-token-generator.ts`, que es donde ya vive todo lo criptográfico:

```ts
export class AesTokenCipher {
  constructor(private readonly key: Buffer) {}
  encrypt(plain: string): string; // devuelve "iv.authTag.ciphertext" en base64
  decrypt(stored: string): string;
}
```

AES-256-GCM con `node:crypto`, IV aleatorio de 12 bytes por operación y el tag de autenticación guardado junto al texto cifrado. GCM y no CBC porque el tag detecta si la fila fue manipulada: descifrar un valor alterado lanza en vez de devolver basura silenciosamente.

**El cifrado es un detalle del repositorio, no del dominio.** `DrizzleGoogleCalendarConnectionRepository` cifra en `upsert` y descifra en `findByProfessionalId`. El puerto sigue prometiendo un `refreshToken: string` utilizable, y ni el caso de uso ni el gateway saben que la columna está cifrada. Si mañana se cambia el esquema de cifrado, cambia un archivo.

### 2.5 Variables de entorno

Tres nuevas en `config/env.ts`, opcionales como ya lo son las de Resend — sin ellas la integración simplemente no se ofrece en el panel:

```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
CALENDAR_TOKEN_KEY     # 32 bytes en base64
```

`CALENDAR_TOKEN_KEY` va con un `refine` que la exige cuando `GOOGLE_CLIENT_ID` está presente. Arrancar con las credenciales de Google configuradas y sin clave de cifrado es un error de despliegue que conviene que reviente al inicio y no cuando la primera profesional intente conectar.

No hay una variable para el redirect URI: se deriva como `${AUTH_URL}/api/google-calendar/callback`. Google exige que el redirect esté registrado carácter por carácter, así que tiene que ser una URL fija y única para toda la app — no puede llevar el slug del tenant. Qué profesional inició el flujo se recupera del parámetro `state`, no de la URL.

### 2.6 El `state` del OAuth no es una tabla

Se genera un valor aleatorio con `CryptoTokenGenerator` (ya existe, lo usan los tokens de verificación de correo), se manda a Google en `state` y se guarda en una cookie `httpOnly` de vida corta. El callback compara la cookie contra el `state` que vuelve y rechaza si no coinciden. Sin esa comparación, cualquiera puede forzar el callback y colgar su propia cuenta de Google a una sesión ajena.

---

## 3. Plan de implementación

Cada paso deja la app funcionando y es commiteable solo.

1. **Esquema y migración.** `calendarConnectionStatusEnum` en `schema/enums.ts`, tabla `googleCalendarConnections` en `schema/calendar.ts` nuevo, columna `googleEventId` en `bookings`. `npm run db:generate`. Nadie lee ni escribe todavía: la app sigue igual con dos objetos más en la base.

2. **Cifrado y entorno.** `AesTokenCipher` en `infrastructure/security/`, con test unitario que cifra, descifra y verifica que alterar un byte del texto cifrado hace fallar el descifrado. Las tres variables nuevas en `config/env.ts` con el `refine` que exige `CALENDAR_TOKEN_KEY` cuando hay `GOOGLE_CLIENT_ID`.

3. **Puertos de dominio.** `calendar-gateway.port.ts`, `google-calendar-connection-repository.port.ts` y `CalendarAccessRevokedError` en `domain/calendar/`. Solo tipos e interfaces, cero implementación.

4. **Repositorio Drizzle.** `DrizzleGoogleCalendarConnectionRepository`, cifrando en `upsert` y descifrando en `findByProfessionalId`. El `upsert` va con `onConflictDoUpdate` sobre `professional_id`, que es lo que hace que reconectar pise la fila vieja en vez de reventar contra el `unique`.

5. **Gateway de Google.** `GoogleCalendarGateway` en `infrastructure/calendar/`, contra la API REST con `fetch`, sin dependencias nuevas. Son tres llamadas: `POST oauth2.googleapis.com/token` para canjear el refresh token por un access token, `POST /calendar/v3/calendars/primary/events` para crear y `DELETE /calendar/v3/calendars/primary/events/{id}` para borrar. El SDK `googleapis` pesa decenas de megas y expone toda la superficie de Google para usar dos endpoints; el paquete no entra.

   Dos detalles que el gateway resuelve y nadie más: `invalid_grant` en la respuesta del token se traduce a `CalendarAccessRevokedError`, y un `410 Gone` al borrar se trata como éxito, porque significa que el evento ya no está, que es exactamente el estado que se quería alcanzar.

6. **Rutas del flujo OAuth.** Tres handlers en `src/app/api/google-calendar/`:

   - `connect/route.ts`: exige sesión de profesional, genera el `state`, lo deja en cookie `httpOnly` y redirige a Google con `access_type=offline`, `prompt=consent` y scope `https://www.googleapis.com/auth/calendar.events`. El `prompt=consent` es obligatorio: sin él, Google devuelve refresh token solo la primera vez que esa cuenta autoriza la app, y una reconexión posterior llegaría sin token que guardar.
   - `callback/route.ts`: valida el `state` contra la cookie, canjea el `code`, lee el correo de la cuenta del `id_token`, hace `upsert` y redirige a `/{slug}/admin/disponibilidad` con un parámetro de resultado.
   - `disconnect/route.ts`: `POST`, borra la fila. No toca ningún evento.

   Solo el scope `calendar.events`, no `calendar` completo: alcanza para crear y borrar eventos y no pide permiso para listar ni borrar calendarios enteros, que es exactamente el poder que no queremos tener.

7. **Casos de uso.** En `application/calendar/`:

   - `SyncBookingToCalendarUseCase`: recibe `bookingId`, busca la conexión activa del profesional, arma el `CalendarEventDraft` y guarda el `googleEventId` en la reserva. Si no hay conexión o está `revoked`, no hace nada y no es un error.
   - `RemoveBookingFromCalendarUseCase`: si la reserva no tiene `googleEventId`, no hace nada. Si tiene, borra el evento y limpia la columna.
   - Ambos capturan `CalendarAccessRevokedError` y llaman a `markRevoked`.

   Con fakes `in-memory-calendar-gateway.ts` e `in-memory-google-calendar-connection.repository.ts` en `__fakes__`, y tests que cubran: sin conexión no pasa nada, con conexión se guarda el id, revocado marca la conexión y no explota.

8. **El evento: qué dice.** El resumen es `{servicio} — {nombre de la clienta}`. La descripción lleva el nombre y correo de la clienta, el precio congelado en CLP y la nota de la clienta si existe. Las horas salen de `startsAt`/`endsAt`, que ya son `timestamptz`, con `timeZone: "America/Santiago"`.

9. **Enganche en las rutas de reserva.** El `try/catch` que ya envuelve la notificación por correo en `confirm/route.ts` gana la llamada al sync, con el mismo comentario y la misma garantía: un fallo de Google no cambia la respuesta. Igual en `cancel/route.ts` y `reject/route.ts`, con el caso de uso de borrado.

10. **Backfill al conectar.** `BackfillCalendarUseCase`: lista las reservas del profesional con `status = 'confirmed'`, `starts_at > now()` y `google_event_id is null`, y las sube una por una. Devuelve `{ intentadas, subidas }`. Se llama desde el callback, después del `upsert`, dentro de su propio `try/catch` — que el backfill falle no puede hacer que la conexión no quede guardada. Método nuevo en `BookingRepository`: `listConfirmedFutureWithoutCalendarEvent(professionalId)`.

11. **UI en `/admin/disponibilidad`.** Un `Panel` nuevo abajo de lo que ya hay, no un ítem de menú propio: la conexión de calendario es parte de cómo la profesional maneja su tiempo, y el menú lateral ya tiene ocho entradas.

    Desconectada muestra el botón "Conectar Google Calendar". Conectada muestra el correo de la cuenta, desde cuándo, y "Desconectar" con confirmación que dice explícitamente que los eventos ya creados se quedan donde están. Si no hay `GOOGLE_CLIENT_ID` en el entorno, el panel no se renderiza.

    Después de volver del callback, el resultado del backfill se muestra una vez: "Listo. Subimos 4 de 4 reservas próximas a tu calendario."

12. **Aviso de conexión caída.** `AccountBanners.tsx` ya es el lugar donde el panel avisa cosas de la cuenta. Se le suma el caso `status = 'revoked'`: "Google dejó de darnos acceso a tu calendario. Tus reservas siguen funcionando, pero no se están agendando." con botón "Reconectar" que apunta a `connect`. Reconectar hace `upsert` sobre la fila revocada y dispara el backfill, que recupera todo lo que no se subió mientras estuvo caída.

Dos cosas del plan que vale la pena ver enteras.

El paso 12 cierra un círculo: como el backfill corre en cada conexión y solo mira reservas sin evento, una conexión que se cae el lunes y se reconecta el viernes recupera sola las cuatro reservas de esos días. No hace falta ningún reintento en background, que es justo lo que quedó fuera de alcance.

El paso 9 toca `reject/route.ts` además de `cancel`. Rechazar una pendiente no debería tener evento que borrar —las pendientes nunca se suben— pero el caso de uso sale sin hacer nada cuando `googleEventId` es nulo, así que engancharlo ahí es gratis y cubre el caso raro de una reserva que se confirmó y se rechazó después.

---

## 4. Criterios de aceptación

1. Una profesional sin `GOOGLE_CLIENT_ID` configurado en el entorno no ve el panel de Google Calendar en ninguna parte del admin.
2. Arrancar la app con `GOOGLE_CLIENT_ID` presente y `CALENDAR_TOKEN_KEY` ausente falla al inicio con un mensaje que nombra la variable que falta, no al intentar conectar.
3. Conectar la cuenta deja una fila en `google_calendar_connections` cuyo `refresh_token` leído directo de la base con `db:studio` no es un token de Google legible.
4. El panel muestra el correo de la cuenta de Google conectada, no el correo de la profesional en la app.
5. Confirmar una reserva crea un evento en el calendario primario de esa cuenta, en el horario correcto en `America/Santiago`, y la reserva queda con `google_event_id` no nulo.
6. Cancelar esa reserva, la cancele la clienta o la profesional, borra el evento y deja `google_event_id` en nulo.
7. Confirmar una reserva con la cuenta desconectada devuelve `200` y la reserva queda confirmada, con `google_event_id` nulo.
8. Confirmar una reserva con credenciales de Google inválidas devuelve `200` y la reserva queda confirmada. El error de Google no llega al cliente.
9. Conectar una cuenta con tres reservas confirmadas futuras sube las tres y el panel informa "3 de 3".
10. Volver a conectar la misma cuenta inmediatamente después no crea ningún evento duplicado y el panel informa "0 de 0".
11. Una reserva confirmada cuya hora ya pasó nunca se sube en un backfill.
12. Revocar el acceso desde la cuenta de Google y después confirmar una reserva deja la conexión en `status = 'revoked'` y hace aparecer el aviso de reconexión en el admin, sin romper la confirmación.
13. Reconectar después de una revocación sube las reservas confirmadas futuras que quedaron sin evento durante la caída.
14. Desconectar borra la fila de `google_calendar_connections` y no borra ningún evento del calendario de Google.
15. Un `state` que no coincide con la cookie hace que el callback rechace la conexión y no guarde ningún token.
16. Los eventos que crea un tenant nunca aparecen en el calendario de otro: cada conexión escribe solo con el token de su propio `professional_id`.
17. Una reserva pendiente, completada o marcada como no-show no crea, borra ni modifica ningún evento.

El 3 y el 15 conviene verificarlos a mano aunque el resto tenga test: uno prueba que el cifrado quedó realmente enganchado —es fácil escribir el cipher y olvidarse de llamarlo en el repositorio— y el otro prueba la única defensa que tiene el callback contra que alguien cuelgue su cuenta de Google en la sesión de otro.

---

## 5. Decisiones

**Sí:** sync en un solo sentido, de la app hacia Google. **No:** traer los ocupados de Google hacia la disponibilidad. Es la mitad más valiosa de la integración, pero exige polling o webhooks con renovación de canales, y decidir quién gana cuando la app y Google no coinciden. Merece su propio spec y no arrastra a este.

**Sí:** solo `confirmed` crea evento y `cancelled` lo borra. **No:** subir las pendientes como `tentative`. Una pendiente que la profesional nunca acepta ensuciaría el calendario, y en la práctica un evento tentativo de Google se ve casi igual que uno confirmado.

**Sí:** columna `bookings.google_event_id`. **No:** tabla `calendar_events` aparte. Una reserva tiene a lo más un evento; la tabla sería infraestructura para un multi-proveedor que no existe.

**Sí:** escribir en el calendario primario. **No:** crear un calendario dedicado "Reservas — {negocio}". El dedicado es más limpio de desconectar, pero obliga a la profesional a acordarse de tenerlo visible, y una hora que no se ve en el calendario donde ella mira su día no sirve para nada.

**Sí:** scope `calendar.events`. **No:** scope `calendar` completo. Alcanza para crear y borrar eventos sin pedir permiso para tocar calendarios enteros.

**No:** invitar a la clienta como asistente. Google le mandaría su propia invitación encima del correo que ya manda Resend desde el SPEC 07: dos mensajes por la misma reserva, uno de ellos en inglés y con la marca de Google. Los datos de la clienta van en el título y la descripción del evento.

**Sí:** cifrar el `refresh_token` con AES-256-GCM antes de guardarlo. **No:** dejarlo plano como están los `password_hash`. La comparación no aplica: un hash de bcrypt es irreversible, un refresh token es una credencial viva con permiso de escritura sobre el calendario de alguien. El costo son veinte líneas y una variable de entorno.

**Sí:** el cifrado vive en el repositorio Drizzle. **No:** en el caso de uso ni en el puerto. El dominio promete un `refreshToken` usable y no sabe cómo está guardado, así que cambiar el esquema de cifrado toca un archivo.

**Sí:** llamar a la API REST de Google con `fetch`. **No:** el paquete `googleapis`. Son tres endpoints; el SDK trae la superficie completa de Google y decenas de megas para eso.

**Sí:** `prompt=consent` en cada autorización. Sin él, Google entrega refresh token solo la primera vez que una cuenta autoriza la app, y toda reconexión posterior llegaría sin nada que guardar — el bug aparecería recién en la segunda conexión de un usuario real.

**Sí:** un solo redirect URI global, `${AUTH_URL}/api/google-calendar/callback`, con el profesional recuperado del `state`. **No:** un redirect por tenant. Google exige registro exacto de cada URI, y el slug del tenant es variable.

**Sí:** backfill al conectar, filtrando por `google_event_id is null`. **No:** dejar el backfill afuera. Conectar la cuenta y ver un calendario vacío se siente roto aunque no lo esté. El filtro por columna nula lo hace idempotente sin ningún registro extra.

**Sí:** reintento manual vía reconectar. **No:** cola de reintentos ni job en background. Como el backfill ya recupera todo lo que quedó sin evento, reconectar es el reintento, y no hace falta infraestructura de trabajos diferidos que el proyecto hoy no tiene.

**Sí:** desconectar deja los eventos donde están. **No:** borrarlos. Son citas reales en el calendario personal de alguien que quizás solo quiso cortar el sync; sacárselas sin que las pida es destructivo e irreversible desde la app.

**Sí:** el panel vive dentro de `/admin/disponibilidad`. **No:** un ítem propio en el menú lateral. El menú ya tiene ocho entradas y la conexión de calendario es parte de cómo la profesional maneja su tiempo.

**Sí:** tratar `410 Gone` al borrar como éxito. El evento ya no está, que es el estado que se quería alcanzar. Fallar ahí dejaría la columna sucia para siempre.

**Sí:** un fallo de Google nunca cambia la respuesta de confirmar o cancelar. Es la misma regla que ya rige la notificación por correo en `confirm/route.ts`, y por la misma razón: la reserva es el negocio, la integración es un accesorio.

**No:** enganchar `completed` ni `no_show`. El evento ya ocurrió; modificarlo después no le cambia el día a nadie.

**No:** la verificación de la app OAuth ante Google. Es un trámite, no código. Mientras la app esté en modo testing el refresh token expira cada siete días y la profesional tiene que reconectar — molesto, pero el aviso de conexión caída del paso 12 lo vuelve visible y recuperable, así que el spec es correcto en los dos mundos.

---

## 6. Riesgos

| Riesgo                                                                                                                                                           | Mitigación                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Se pierde `CALENDAR_TOKEN_KEY`. Todos los `refresh_token` guardados quedan ilegibles.                                                                            | No hay recuperación posible: cada profesional tiene que reconectar. La clave se guarda en Vercel junto al resto de las variables y se anota en el gestor de contraseñas antes de deployar. Rotarla exige una migración que descifre con la vieja y vuelva a cifrar con la nueva, o aceptar que todos reconecten. |
| Modo testing de Google: el refresh token expira cada 7 días y la profesional tiene que reconectar cada semana.                                                   | El aviso de conexión caída lo hace visible en el panel y el backfill al reconectar recupera lo que quedó sin subir. Molesto, no roto. Se resuelve de verdad mandando la app a verificación, que es trámite operativo.                                                                                            |
| La profesional borra o mueve el evento desde Google. La app no se entera y el `google_event_id` queda apuntando a algo que ya no existe o que está en otra hora. | Borrar la reserva después devuelve `410`, que se trata como éxito. Mover el evento no tiene mitigación en este spec: la app sigue considerando válida la hora de la reserva, que es la fuente de verdad. La sincronización inversa es otro spec.                                                                 |
| Escribir en el calendario primario mezcla las horas de la app con la vida personal de la profesional, y un bug de la app puede ensuciar su calendario real.      | El scope `calendar.events` no permite borrar calendarios ni tocar eventos que la app no creó. El borrado siempre va por `google_event_id` guardado, nunca por búsqueda de coincidencias, así que la app solo puede borrar lo que ella misma creó.                                                                |
| Una reserva confirmada mientras Google está caído queda para siempre sin evento y nadie se entera.                                                               | El backfill al reconectar la levanta, pero solo si la profesional reconecta. Si nunca lo hace, esa hora no aparece en el calendario. Es la contrapartida aceptada de no tener cola de reintentos.                                                                                                                |
| El `state` en cookie no sobrevive si el navegador la bloquea, y la conexión falla sin explicación clara.                                                         | La cookie es de primera parte (mismo dominio de la app), `httpOnly`, `SameSite=Lax` — que es lo que permite que llegue en el redirect de vuelta desde Google. Un `state` que no coincide devuelve un error explícito en el panel, no una pantalla en blanco.                                                     |
| Un fallo en el backfill deja la conexión sin guardar y la profesional cree que no conectó.                                                                       | El backfill corre en su propio `try/catch` después del `upsert`. La conexión queda guardada aunque no suba una sola reserva.                                                                                                                                                                                     |

---

## 7. Fuera de alcance

- Traer los horarios ocupados de Google hacia la disponibilidad de la app.
- Enterarse de cambios hechos del lado de Google.
- Outlook, Apple Calendar, descarga de `.ics`.
- Invitar a la clienta al evento.
- Reintentos automáticos o cualquier trabajo en background.
- Elegir en qué calendario se escribe.
- La verificación de la app OAuth ante Google.

Cada uno, si alguna vez entra, va en su propio spec.
