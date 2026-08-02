# SPEC 11 — Registro de profesionales

**Estado:** Draft
**Alcance:** auto-registro de manicuristas con código de invitación y período de prueba, verificación de correo, y reserva de slugs del sistema. Mata la dependencia de `scripts/seed.ts` para dar de alta un tenant.

Hoy los tenants solo se crean corriendo el seed a mano. Nadie puede registrarse solo, así que cada alta pasa por el equipo. Este spec abre el registro sin construir facturación: el control de acceso es un código de invitación al entrar y una fecha de vencimiento al salir; el cobro sigue siendo una conversación fuera del producto.

---

## 1. Decisiones de diseño

### 1.1 El registro vive en la raíz, no bajo `/[slug]`

`/[slug]/registro` ya existe y es para **clientas** de un tenant que ya existe. La profesional todavía no tiene slug cuando se registra, así que su formulario vive en `/registro-profesional` (segmento estático, gana sobre `[slug]` en el router de Next).

### 1.2 Tres compuertas, en tres momentos distintos

| Compuerta | Cuándo actúa | Qué bloquea |
| --- | --- | --- |
| Código de invitación | Al registrarse | Crear la cuenta |
| Verificación de correo | Antes de publicar | Que el micrositio sea visible |
| Vencimiento de prueba | A los 30 días | Que el micrositio siga visible |

Ninguna de las tres bloquea el panel. La profesional siempre puede entrar a configurar su negocio; lo único que se apaga es la cara pública. Esto es deliberado: el momento en que decide si el producto vale la pena es cuando ve su micrositio armado, y ponerle una espera antes de eso mata la conversión.

La propiedad ya existe en el código y no hay que construirla: `professionals.active` se chequea en
[get-professional-by-slug.use-case.ts](src/server/application/tenant/get-professional-by-slug.use-case.ts), que alimenta las páginas públicas, mientras que `requireTenantOwner` consulta el repositorio directo y no lo mira. El vencimiento de prueba y la verificación se suman **en el mismo lugar** que `active`, así que heredan el comportamiento gratis.

### 1.3 La verificación de correo bloquea publicar, no entrar

Resend hoy no puede enviar a terceros: sin dominio verificado solo despacha a la casilla del dueño de la cuenta. Si la verificación bloqueara el registro, nadie podría darse de alta.

Bloquear *publicar* en cambio resuelve dos cosas a la vez: es el anti-abuso natural contra el acaparamiento de slugs con correos falsos, y no depende del correo para que alguien empiece a usar el producto.

**Prerequisito de operación:** verificar el dominio en resend.com/domains antes de abrir el registro a gente real. El plan gratuito (3.000 correos/mes) alcanza de sobra; lo que falta es el DNS.

### 1.4 Sin transacciones: `db.batch`

El alta inserta usuario + professional + catálogo de diseño + servicios + variantes de una sola vez. **`neon-http` no soporta `db.transaction()`** (ver CLAUDE.md). Se usa `db.batch([...])` con los uuid generados en la aplicación con `crypto.randomUUID()`, igual que
[drizzle-booking.repository.ts](src/server/infrastructure/repositories/drizzle-booking.repository.ts).

---

## 2. Esquema

Tres cambios aditivos. Ninguna columna existente cambia de tipo ni se vuelve obligatoria.

### 2.1 `professionals` — dos columnas nuevas

```
trial_ends_at   timestamptz  NULL   -- NULL = sin vencimiento (cuentas internas, grandfathered)
published_at    timestamptz  NULL   -- NULL = nunca publicó; se setea al verificar correo
```

`trial_ends_at` nullable a propósito: una cuenta sin fecha no vence nunca. Es como se marcan las cuentas internas y las que ya pagaron, sin necesitar todavía una tabla de suscripciones.

### 2.2 `invite_codes` — tabla nueva

```
id                     uuid PK  default gen_random_uuid()
code                   text NOT NULL UNIQUE
note                   text             -- para qué / a quién se le dio
used_by_professional_id uuid            -- FK professionals.id, NULL mientras no se usa
used_at                timestamptz
expires_at             timestamptz      -- NULL = no vence
created_at             timestamptz NOT NULL default now()
```

Un código, un uso. Se generan a mano (`db:studio` o script); no hay UI para crearlos — cuando haga falta, será su propio spec.

### 2.3 `email_verification_tokens` — tabla nueva

Espejo de `password_reset_tokens`, que ya resuelve este problema:

```
id          uuid PK  default gen_random_uuid()
user_id     uuid NOT NULL  -- FK users.id
token_hash  text NOT NULL UNIQUE
expires_at  timestamptz NOT NULL
used_at     timestamptz
created_at  timestamptz NOT NULL default now()
```

El token viaja en el link, en la base solo vive el hash. TTL 24 h (más largo que el de contraseña, que son 60 min: verificar el correo no es urgente y el link puede quedar sepultado en la bandeja).

`users.email_verified_at` ya existe en el esquema desde el SPEC 01 y nunca se seteó. Este spec lo empieza a usar.

---

## 3. Dominio

### 3.1 Slugs reservados — `src/server/domain/tenant/reserved-slugs.ts`

Función pura, con tests. Dos razones para rechazar un slug:

**Formato:** minúsculas, números y guiones. 3–30 caracteres. Sin guion al principio ni al final, sin guiones dobles.

**Reservados**, en tres grupos:

- *Rutas que ya existen y romperían la app:* `api`, `estilo`, `admin`, `login`, `registro`, `registro-profesional`, `recuperar`, `cuenta`, `reservar`, `servicios`, `opiniones`, `_next`.
- *Marca del producto:* `misunas`, `misunas-app`, `app`, `www`.
- *Genéricos que no queremos regalar:* `ayuda`, `soporte`, `help`, `support`, `blog`, `about`, `contacto`, `precios`, `terminos`, `privacidad`, `test`, `demo`, `null`, `undefined`.

Un slug reservado se rechaza con el mismo mensaje que uno tomado ("no está disponible"), sin decir por qué: la lista no es información que le sirva a quien se registra.

### 3.2 Catálogo inicial — `src/server/domain/tenant/default-catalog.ts`

`scripts/seed.ts` ya arma un catálogo completo (acabados mate/brillante/glitter, decoraciones francesa/degradé/pedrería con sus `priceDeltaClp` y `extraMinutes`, más tres servicios con variantes corta/media/larga). Ese contenido se extrae a una función pura que devuelve la data a insertar, y la consumen **los dos**: el seed y el registro nuevo.

No es contenido nuevo: es mover lo que ya existe a donde ambos lo alcanzan.

### 3.3 Estado público de un tenant

Una sola función pura decide si un micrositio se ve, para que la regla no quede repartida:

```
canPublish(professional, now) =
  professional.active
  && professional.publishedAt !== null
  && (professional.trialEndsAt === null || professional.trialEndsAt > now)
```

Se aplica en `GetProfessionalBySlugUseCase`, que es por donde pasan todas las páginas públicas del tenant.

---

## 4. Casos de uso y API

### 4.1 `POST /api/professionals` — `RegisterProfessionalUseCase`

Entrada: `{ inviteCode, slug, businessName, email, password, name }`.

Orden de validación (importa: lo más barato primero, y nunca revelar de más):

1. Formato de slug y lista de reservados.
2. Código de invitación existe, no usado, no vencido.
3. Slug no tomado.
4. Correo no registrado.
5. `db.batch([...])`: crear usuario (`role: "professional"`, hash bcrypt), crear professional con `trial_ends_at = now + 30 días` y `published_at = null`, insertar catálogo por defecto, marcar el código como usado.
6. Emitir token de verificación y enviar el correo. **Best effort**: si el envío falla, el registro no se revierte — la cuenta ya existe y el correo se puede reenviar.

Errores tipados en dominio: `InviteCodeInvalidError`, `SlugUnavailableError`, `EmailAlreadyRegisteredError` (ya existe, se reutiliza).

### 4.2 `POST /api/email-verification` — reenviar

Rate limit 3 por hora por usuario, copiando el patrón de `RequestPasswordResetUseCase`.

### 4.3 `GET /verificar/[token]` — confirmar

Marca `users.email_verified_at`, marca el token usado, y setea `professionals.published_at` si el usuario es dueño de un tenant. Ese es el momento en que el micrositio se vuelve visible.

Token inválido o vencido: pantalla con la salida ("pedir un enlace nuevo"), nunca un error crudo.

---

## 5. UI

### 5.1 `/registro-profesional`

Formulario de una columna sobre `AuthCard`, en el sistema de marca (tokens por defecto, no hay tenant todavía que aporte los suyos).

Campos: código de invitación, nombre del negocio, slug, nombre, correo, contraseña.

Dos detalles que hacen la diferencia:

- **El slug se sugiere solo** a partir del nombre del negocio ("Uñas por Karla" → `unas-por-karla`), editable. Nadie quiere pensar una URL desde cero.
- **Disponibilidad en vivo** contra `GET /api/professionals/slug-disponible?slug=`, con debounce. Enterarse de que el slug está tomado recién al enviar es de las frustraciones más caras de un registro.

Se muestra la URL final mientras escribe: `misunas.cl/unas-por-karla`.

### 5.2 Avisos en el panel

Dos banners en el layout del admin, sobre `InfoNote`:

- **Sin verificar:** "Tu sitio todavía no es visible. Verifica tu correo para publicarlo." + botón de reenvío.
- **Prueba por vencer** (7 días o menos) **o vencida:** días restantes, o el aviso de que el sitio se despublicó y cómo renovar.

Ambos son informativos: nunca bloquean el panel.

---

## 6. Operación

Sin panel de superadmin. No existe rol admin en el enum (`["client", "professional"]`) y agregarlo implica migración, rutas y guards nuevos para un volumen que todavía no existe. Con `npm run db:studio` se genera un código de invitación, se extiende un `trial_ends_at` y se apaga un `active` abusivo.

Cuando haya ~20 tenants, el panel será su propio spec.

---

## 7. Criterios de aceptación

1. Alguien con código válido se registra en `/registro-profesional` y queda con sesión iniciada en su panel, con catálogo y servicios ya cargados.
2. Su micrositio público responde 404 hasta que verifica el correo.
3. Al verificar, el micrositio queda visible y `published_at` queda seteado.
4. Un código ya usado, vencido o inexistente rechaza el registro sin crear nada.
5. Los slugs reservados y los mal formados se rechazan, con el mismo mensaje que uno tomado.
6. `api`, `estilo` y `admin` siguen resolviendo a sus rutas reales, no a un tenant.
7. Vencido el `trial_ends_at`, el micrositio deja de verse y el panel sigue accesible con el aviso.
8. Un `trial_ends_at` nulo no vence nunca.
9. El seed sigue funcionando y produce el mismo catálogo que el registro nuevo.
10. Si Resend falla al enviar la verificación, la cuenta igual queda creada y el correo se puede reenviar.

---

## 8. Fuera de alcance

Facturación, planes, pasarela de pago, panel de superadmin, UI para crear códigos de invitación, y recuperar el slug de un tenant dado de baja.
